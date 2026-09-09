using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

public static class NativeHostLauncher
{
    public static int Main()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string scriptPath = Path.Combine(baseDir, "opencode-host.ps1");
        if (!File.Exists(scriptPath))
        {
            Console.Error.WriteLine("Native host script not found: " + scriptPath);
            return 2;
        }

        string powershell = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.System),
            "WindowsPowerShell",
            "v1.0",
            "powershell.exe");
        if (!File.Exists(powershell))
        {
            powershell = "powershell.exe";
        }

        var psi = new ProcessStartInfo
        {
            FileName = powershell,
            Arguments = "-NoProfile -ExecutionPolicy Bypass -File " + Quote(scriptPath),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };

        using (var child = Process.Start(psi))
        {
            if (child == null)
            {
                Console.Error.WriteLine("Failed to start PowerShell native host.");
                return 3;
            }

            var stdinPump = Task.Run(() => Pump(Console.OpenStandardInput(), child.StandardInput.BaseStream, true));
            var stdoutPump = Task.Run(() => Pump(child.StandardOutput.BaseStream, Console.OpenStandardOutput(), false));
            var stderrPump = Task.Run(() => child.StandardError.ReadToEnd());

            child.WaitForExit();
            try { stdinPump.Wait(1000); } catch { }
            try { stdoutPump.Wait(1000); } catch { }
            try
            {
                string stderr = stderrPump.Result;
                if (!string.IsNullOrEmpty(stderr)) Console.Error.Write(stderr);
            }
            catch { }
            return child.ExitCode;
        }
    }

    private static void Pump(Stream input, Stream output, bool closeOutput)
    {
        byte[] buffer = new byte[8192];
        try
        {
            int read;
            while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
            {
                output.Write(buffer, 0, read);
                output.Flush();
            }
        }
        catch
        {
        }
        finally
        {
            if (closeOutput)
            {
                try { output.Close(); } catch { }
            }
        }
    }

    private static string Quote(string value)
    {
        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }
}
