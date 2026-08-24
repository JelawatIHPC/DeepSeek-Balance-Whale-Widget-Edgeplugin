$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using System.Web.Script.Serialization;

public static class Wsq {
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_open_v2(string filename, out IntPtr db, int flags, IntPtr vfs);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_close(IntPtr db);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_prepare_v2(IntPtr db, string sql, int nByte, out IntPtr stmt, IntPtr tail);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_step(IntPtr stmt);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr sqlite3_column_text(IntPtr stmt, int col);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_column_bytes(IntPtr stmt, int col);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern long sqlite3_column_int64(IntPtr stmt, int col);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_finalize(IntPtr stmt);

    private const int OPEN_READONLY = 0x00000001;
    private const int ROW = 100;

    private static string ColText(IntPtr stmt, int col) {
        int n = sqlite3_column_bytes(stmt, col);
        IntPtr p = sqlite3_column_text(stmt, col);
        if (p == IntPtr.Zero) return null;
        byte[] b = new byte[n];
        Marshal.Copy(p, b, 0, n);
        return Encoding.UTF8.GetString(b);
    }

    private static double Num(Dictionary<string, object> d, string key) {
        object v;
        if (!d.TryGetValue(key, out v)) return 0;
        try { return Convert.ToDouble(v); } catch (Exception) { return 0; }
    }

    public static string Query(string dbPath, long todayStartMs, long monthStartMs) {
        IntPtr db = IntPtr.Zero;
        if (sqlite3_open_v2(dbPath, out db, OPEN_READONLY, IntPtr.Zero) != 0) {
            if (db != IntPtr.Zero) sqlite3_close(db);
            return "{\"dbFound\":false}";
        }
        try {
            IntPtr stmt = IntPtr.Zero;
            string sql = "SELECT time_created, data FROM message";
            if (sqlite3_prepare_v2(db, sql, -1, out stmt, IntPtr.Zero) != 0) {
                return "{\"dbFound\":true,\"error\":\"prepare\"}";
            }
            var ser = new JavaScriptSerializer();
            long todayTokens = 0, monthTokens = 0;
            double todayCost = 0, monthCost = 0;
            var todayModels = new Dictionary<string, double[]>();
            var monthModels = new Dictionary<string, double[]>();
            int rows = 0;
            int rc;
            while ((rc = sqlite3_step(stmt)) == ROW) {
                rows++;
                long t = sqlite3_column_int64(stmt, 0);
                string data = ColText(stmt, 1);
                if (data == null) continue;
                object obj;
                try { obj = ser.DeserializeObject(data); } catch (Exception) { continue; }
                var dict = obj as Dictionary<string, object>;
                if (dict == null || !dict.ContainsKey("tokens")) continue;
                var tok = dict["tokens"] as Dictionary<string, object>;
                if (tok == null) continue;
                double input = Num(tok, "input"), output = Num(tok, "output"), reasoning = Num(tok, "reasoning");
                double cr = 0, cw = 0;
                object cacheObj;
                if (tok.TryGetValue("cache", out cacheObj)) {
                    var cache = cacheObj as Dictionary<string, object>;
                    if (cache != null) { cr = Num(cache, "read"); cw = Num(cache, "write"); }
                }
                double total = input + output + reasoning + cr + cw;
                double cost = 0;
                object costObj;
                if (dict.TryGetValue("cost", out costObj)) {
                    try { cost = Convert.ToDouble(costObj); } catch (Exception) { cost = 0; }
                }
                string model = "unknown";
                object modelObj;
                if (dict.TryGetValue("modelID", out modelObj) && modelObj != null) {
                    string ms = modelObj.ToString();
                    if (ms.Length > 0) model = ms;
                }
                if (t >= todayStartMs) {
                    todayTokens += (long)total;
                    todayCost += cost;
                    double[] agg;
                    if (!todayModels.TryGetValue(model, out agg)) { agg = new double[2]; todayModels[model] = agg; }
                    agg[0] += total;
                    agg[1] += cost;
                }
                if (t >= monthStartMs) {
                    monthTokens += (long)total;
                    monthCost += cost;
                    double[] agg2;
                    if (!monthModels.TryGetValue(model, out agg2)) { agg2 = new double[1]; monthModels[model] = agg2; }
                    agg2[0] += total;
                }
            }
            sqlite3_finalize(stmt);
            string todayTop = "", todayTopCost = "", monthTop = "";
            double todayTopT = 0, todayTopC = 0, monthTopT = 0;
            foreach (var kv in todayModels) {
                if (kv.Value[0] > todayTopT) { todayTopT = kv.Value[0]; todayTop = kv.Key; }
                if (kv.Value[1] > todayTopC) { todayTopC = kv.Value[1]; todayTopCost = kv.Key; }
            }
            foreach (var kv in monthModels) {
                if (kv.Value[0] > monthTopT) { monthTopT = kv.Value[0]; monthTop = kv.Key; }
            }
            return "{\"dbFound\":true,\"rows\":" + rows +
                ",\"today\":{\"tokens\":" + todayTokens + ",\"cost\":" + todayCost.ToString("R") +
                ",\"top\":{\"name\":\"" + todayTop + "\",\"tokens\":" + todayTopT.ToString("R") + "}" +
                ",\"topCost\":{\"name\":\"" + todayTopCost + "\",\"cost\":" + todayTopC.ToString("R") + "}}" +
                ",\"month\":{\"tokens\":" + monthTokens + ",\"cost\":" + monthCost.ToString("R") +
                ",\"top\":{\"name\":\"" + monthTop + "\",\"tokens\":" + monthTopT.ToString("R") + "}}}";
        } finally {
            sqlite3_close(db);
        }
    }
}
'@ -ReferencedAssemblies 'System.Web.Extensions'

$stdin = [Console]::OpenStandardInput()
$stdout = [Console]::OpenStandardOutput()
$utf8 = [System.Text.Encoding]::UTF8

function Read-Frame($stream) {
    $lenBytes = New-Object byte[] 4
    $read = 0
    while ($read -lt 4) {
        $n = $stream.Read($lenBytes, $read, 4 - $read)
        if ($n -le 0) { return $null }
        $read += $n
    }
    $len = [BitConverter]::ToInt32($lenBytes, 0)
    if ($len -lt 1 -or $len -gt 1048576) { return $null }
    $buf = New-Object byte[] $len
    $read = 0
    while ($read -lt $len) {
        $n = $stream.Read($buf, $read, $len - $read)
        if ($n -le 0) { return $null }
        $read += $n
    }
    return $utf8.GetString($buf)
}

function Write-Frame($stream, $obj) {
    $json = $obj | ConvertTo-Json -Compress
    $bytes = $utf8.GetBytes($json)
    $lenBytes = [BitConverter]::GetBytes([int]$bytes.Length)
    $stream.Write($lenBytes, 0, 4)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
}

$db = Join-Path $HOME '.local\share\opencode\opencode.db'
$epoch = [datetime]'1970-01-01 00:00:00'
$todayStart = [datetime]::Today
$monthStart = [datetime]::new($todayStart.Year, $todayStart.Month, 1)
$todayMs = [long](($todayStart.ToUniversalTime()) - $epoch).TotalMilliseconds
$monthMs = [long](($monthStart.ToUniversalTime()) - $epoch).TotalMilliseconds

while ($true) {
    $msg = Read-Frame $stdin
    if ($null -eq $msg) { break }
    try {
        $req = $msg | ConvertFrom-Json
        if ($req.cmd -eq 'usage') {
            if (Test-Path -LiteralPath $db) {
                $raw = [Wsq]::Query($db, $todayMs, $monthMs)
                $parsed = $raw | ConvertFrom-Json
                Write-Frame $stdout @{ dbFound = [bool]$parsed.dbFound; today = $parsed.today; month = $parsed.month }
            } else {
                Write-Frame $stdout @{ dbFound = $false; error = 'opencode db not found' }
            }
        } else {
            Write-Frame $stdout @{ error = 'unknown cmd' }
        }
    } catch {
        try { Write-Frame $stdout @{ error = $_.Exception.Message } } catch {}
    }
}
