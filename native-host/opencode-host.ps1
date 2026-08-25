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

# ---- Codex data source (WindexBar-compatible) ----
$script:rpcProcess = $null
$script:rpcId = 0

function Get-CodexExecutable {
    $cmd = Get-Command codex -ErrorAction SilentlyContinue
    if ($null -eq $cmd -or [string]::IsNullOrWhiteSpace($cmd.Source)) { return $null }
    return $cmd.Source
}

function Get-CodexHome {
    if (-not [string]::IsNullOrWhiteSpace($env:CODEX_HOME)) { return $env:CODEX_HOME }
    return Join-Path $HOME '.codex'
}

function Start-CodexRpcProcess($exe) {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $exe
    $psi.Arguments = '-s read-only -a never app-server'
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $script:rpcProcess = [System.Diagnostics.Process]::Start($psi)
    $script:rpcId = 0
    return $null -ne $script:rpcProcess
}

function Stop-CodexRpcProcess {
    if ($null -ne $script:rpcProcess) {
        if (-not $script:rpcProcess.HasExited) { $script:rpcProcess.Kill() }
        $script:rpcProcess.Dispose()
        $script:rpcProcess = $null
    }
}

function Send-CodexRpc($method, $params) {
    $script:rpcId++
    $msg = @{ id = $script:rpcId; method = $method; params = $params }
    $json = $msg | ConvertTo-Json -Compress -Depth 20
    $script:rpcProcess.StandardInput.WriteLine($json)
    $script:rpcProcess.StandardInput.Flush()
    return $script:rpcId
}

function Send-CodexNotification($method, $params) {
    $msg = @{ method = $method; params = $params }
    $json = $msg | ConvertTo-Json -Compress -Depth 10
    $script:rpcProcess.StandardInput.WriteLine($json)
    $script:rpcProcess.StandardInput.Flush()
}

function Read-CodexRpc($targetId, $timeoutMs) {
    $deadline = [DateTimeOffset]::Now.AddMilliseconds($timeoutMs)
    while ([DateTimeOffset]::Now -lt $deadline) {
        $remaining = [int][Math]::Max(1, ($deadline - [DateTimeOffset]::Now).TotalMilliseconds)
        $task = $script:rpcProcess.StandardOutput.ReadLineAsync()
        if (-not $task.Wait($remaining)) { return $null }
        $line = $task.Result
        if ($null -eq $line) { return $null }
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try { $msg = $line | ConvertFrom-Json } catch { continue }
        if ($null -eq $msg.id -or [int]$msg.id -ne $targetId) { continue }
        if ($null -ne $msg.error) { return $null }
        return $msg.result
    }
    return $null
}

function Invoke-CodexRpcSnapshot($exe) {
    if (-not (Start-CodexRpcProcess $exe)) { return $null }
    try {
        $id = Send-CodexRpc 'initialize' @{ clientInfo = @{ name = 'dsh-whale'; version = '0.1.0' } }
        if ($null -eq (Read-CodexRpc $id 10000)) { return $null }
        Send-CodexNotification 'initialized' @{}
        $idLimits = Send-CodexRpc 'account/rateLimits/read' @{}
        $limits = Read-CodexRpc $idLimits 10000
        if ($null -eq $limits) { return $null }
        $plan = $null
        $idAcct = Send-CodexRpc 'account/read' @{}
        $acct = Read-CodexRpc $idAcct 5000
        if ($null -ne $acct -and $null -ne $acct.account) {
            $pt = $acct.account.planType
            if ($pt) { $plan = @{ planType = [string]$pt } }
        }
        return @{ limits = $limits; plan = $plan }
    } finally {
        Stop-CodexRpcProcess
    }
}

function Read-CodexTomlConfig {
    $configPath = Join-Path (Get-CodexHome) 'config.toml'
    $model = $null
    if (-not (Test-Path -LiteralPath $configPath)) { return $model }
    try {
        foreach ($rawLine in [System.IO.File]::ReadLines($configPath)) {
            $line = $rawLine.Trim()
            if ($line.Length -eq 0) { continue }
            $hash = $line.IndexOf('#')
            if ($hash -ge 0) { $line = $line.Substring(0, $hash).Trim() }
            if ($line.Length -eq 0) { continue }
            $eq = $line.IndexOf('=')
            if ($eq -le 0) { continue }
            $key = $line.Substring(0, $eq).Trim()
            if ($key -ne 'model') { continue }
            $val = $line.Substring($eq + 1).Trim()
            if ($val.Length -ge 2 -and $val[0] -eq '"' -and $val[$val.Length - 1] -eq '"') {
                $val = $val.Substring(1, $val.Length - 2)
            }
            if (-not [string]::IsNullOrWhiteSpace($val)) { $model = $val }
        }
    } catch {}
    return $model
}

function ConvertTo-CodexWindow($windowObj) {
    if ($null -eq $windowObj) { return $null }
    $used = $null
    if ($null -ne $windowObj.used_percent) { $used = [double]$windowObj.used_percent }
    elseif ($null -ne $windowObj.usedPercent) { $used = [double]$windowObj.usedPercent }
    if ($null -eq $used) { return $null }
    $minutes = $null
    if ($null -ne $windowObj.window_minutes) { $minutes = [int]$windowObj.window_minutes }
    elseif ($null -ne $windowObj.windowDurationMins) { $minutes = [int]$windowObj.windowDurationMins }
    elseif ($null -ne $windowObj.windowDurationMinutes) { $minutes = [int]$windowObj.windowDurationMinutes }
    $resetsAt = $null
    if ($null -ne $windowObj.resets_at) { $resetsAt = [int64]$windowObj.resets_at }
    elseif ($null -ne $windowObj.resetsAt) { $resetsAt = [int64]$windowObj.resetsAt }
    return @{ usedPercent = $used; resetsAt = $resetsAt; windowMinutes = $minutes }
}

function Is-CodexWeeklyWindow($minutes) {
    return $null -ne $minutes -and $minutes -ge 10080 -and $minutes -lt 11520
}

function Set-CodexWindows([hashtable]$store, $primary, $secondary) {
    # 按 WindexBar 语义：secondary 默认周窗口；周窗口(7d-8d)归 secondary，其余归 primary
    if ($null -ne $primary) {
        if (Is-CodexWeeklyWindow $primary.windowMinutes) { $store.secondary = $primary }
        else { $store.primary = $primary }
    }
    if ($null -ne $secondary) {
        if (Is-CodexWeeklyWindow $secondary.windowMinutes) { $store.secondary = $secondary }
        elseif ($null -eq $store.secondary) { $store.secondary = $secondary }
        else { $store.primary = $secondary }
    }
}

function Read-CodexSessionState {
    # 返回 @{ activeModel; tokens; limits }
    $result = @{ activeModel = $null; tokens = $null; limits = @{} }
    $sessionsDir = Join-Path (Get-CodexHome) 'sessions'
    if (-not (Test-Path -LiteralPath $sessionsDir)) { return $result }
    $files = @(Get-ChildItem -LiteralPath $sessionsDir -Recurse -Filter 'rollout-*.jsonl' -ErrorAction SilentlyContinue |
        Where-Object { -not $_.PSIsContainer } |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 40)
    $bestTimestamp = $null
    foreach ($file in $files) {
        try {
            foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
                if (-not $line.Contains('"type"')) { continue }
                if ($line -notmatch 'turn_context|session_meta|thread_settings|threadSettings|rate_limits|rateLimits|token_count|token_usage|tokenUsage') { continue }
                try { $obj = $line | ConvertFrom-Json } catch { continue }
                $type = [string]$obj.type
                if ($type -eq 'session_meta') {
                    if ($null -ne $obj.payload -and $obj.payload.thread_source -eq 'subagent') { break }
                    continue
                }
                if ($null -eq $obj.payload) { continue }
                $timestamp = $null
                if ($null -ne $obj.timestamp) { try { $timestamp = [DateTimeOffset]$obj.timestamp } catch {} }
                $isNewer = $null -eq $bestTimestamp -or ($null -ne $timestamp -and $timestamp -gt $bestTimestamp)
                if ($type -eq 'turn_context' -or $type -eq 'thread_settings') {
                    if ($null -eq $result.activeModel -or $isNewer) {
                        $model = $null
                        foreach ($key in @('model', 'modelName', 'model_name', 'selectedModel', 'selected_model')) {
                            if ($null -ne $obj.payload.$key) { $model = [string]$obj.payload.$key; break }
                        }
                        if (-not [string]::IsNullOrWhiteSpace($model)) {
                            $result.activeModel = $model
                            $bestTimestamp = $timestamp
                        }
                    }
                    continue
                }
                if ($obj.payload.PSObject.Properties.Name -contains 'rate_limits' -or $obj.payload.PSObject.Properties.Name -contains 'rateLimits') {
                    $limits = $obj.payload.rate_limits
                    if ($null -eq $limits) { $limits = $obj.payload.rateLimits }
                    $primary = ConvertTo-CodexWindow $limits.primary
                    $secondary = ConvertTo-CodexWindow $limits.secondary
                    if ($null -ne $primary -or $null -ne $secondary) {
                        Set-CodexWindows $result.limits $primary $secondary
                    }
                    continue
                }
                if ($obj.payload.PSObject.Properties.Name -contains 'info') {
                    $info = $obj.payload.info
                    $tok = $info.total_token_usage
                    if ($null -eq $tok) { $tok = $info.totalTokenUsage }
                    if ($null -ne $tok) {
                        $total = if ($null -ne $tok.total_tokens) { [int64]$tok.total_tokens } elseif ($null -ne $tok.totalTokens) { [int64]$tok.totalTokens } else { 0 }
                        $inputT = if ($null -ne $tok.input_tokens) { [int64]$tok.input_tokens } elseif ($null -ne $tok.inputTokens) { [int64]$tok.inputTokens } else { 0 }
                        $cachedT = if ($null -ne $tok.cached_input_tokens) { [int64]$tok.cached_input_tokens } elseif ($null -ne $tok.cachedInputTokens) { [int64]$tok.cachedInputTokens } else { 0 }
                        $outputT = if ($null -ne $tok.output_tokens) { [int64]$tok.output_tokens } elseif ($null -ne $tok.outputTokens) { [int64]$tok.outputTokens } else { 0 }
                        if ($total -gt 0 -or $inputT -gt 0 -or $outputT -gt 0) {
                            if ($result.tokens -eq $null -or $isNewer) {
                                $result.tokens = @{ input = $inputT; cached = $cachedT; output = $outputT; total = $total }
                            }
                        }
                    }
                }
            }
        } catch {}
    }
    if ($null -eq $result.activeModel) {
        $result.activeModel = Read-CodexTomlConfig
    }
    return $result
}

function Get-CodexSnapshot {
    $exe = Get-CodexExecutable
    $state = Read-CodexSessionState
    $payload = @{
        cliFound = $null -ne $exe
        source = 'none'
        plan = $null
        limits = $null
        credits = $null
        tokens = $state.tokens
        activeModel = $state.activeModel
    }
    $rpc = $null
    if ($null -ne $exe) {
        try { $rpc = Invoke-CodexRpcSnapshot $exe } catch { $rpc = $null }
    }
    if ($null -ne $rpc -and $null -ne $rpc.limits) {
        $payload.source = 'rpc'
        $rateLimits = $rpc.limits.rateLimits
        if ($null -eq $rateLimits) { $rateLimits = $rpc.limits }
        $primary = ConvertTo-CodexWindow $rateLimits.primary
        $secondary = ConvertTo-CodexWindow $rateLimits.secondary
        $limitsHash = @{}
        Set-CodexWindows $limitsHash $primary $secondary
        # RPC 缺失的窗口用会话文件兜底
        if ($null -eq $limitsHash.primary) { $limitsHash.primary = $state.limits.primary }
        if ($null -eq $limitsHash.secondary) { $limitsHash.secondary = $state.limits.secondary }
        if ($null -ne $limitsHash.primary -or $null -ne $limitsHash.secondary) {
            $payload.limits = $limitsHash
        }
        if ($null -ne $rateLimits.credits -and $null -ne $rateLimits.credits.balance) {
            $payload.credits = @{ balance = [string]$rateLimits.credits.balance }
        }
        if ($null -ne $rpc.plan) { $payload.plan = $rpc.plan }
    } elseif ($null -ne $state.limits.primary -or $null -ne $state.limits.secondary) {
        $payload.source = 'files'
        $payload.limits = $state.limits
    } elseif ($null -ne $state.tokens -or $null -ne $state.activeModel) {
        $payload.source = 'files'
    }
    return $payload
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
        } elseif ($req.cmd -eq 'codex') {
            $result = Get-CodexSnapshot
            Write-Frame $stdout $result
        } else {
            Write-Frame $stdout @{ error = 'unknown cmd' }
        }
    } catch {
        try { Write-Frame $stdout @{ error = $_.Exception.Message } } catch {}
    }
}
