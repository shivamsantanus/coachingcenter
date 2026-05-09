using System.Diagnostics;

namespace ClassNovaApi;

public class AngularDevServerService : IHostedService
{
    private readonly ILogger<AngularDevServerService> _logger;
    private readonly string _frontendPath;
    private Process? _process;

    public AngularDevServerService(ILogger<AngularDevServerService> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _frontendPath = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "frontend"));
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!Directory.Exists(_frontendPath))
        {
            _logger.LogWarning("Frontend directory not found at {Path} — Angular dev server not started.", _frontendPath);
            return Task.CompletedTask;
        }

        var (fileName, arguments) = OperatingSystem.IsWindows()
            ? ("cmd.exe", "/c npm start")
            : ("/bin/sh", "-c \"npm start\"");

        _process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                WorkingDirectory = _frontendPath,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };

        _process.OutputDataReceived += (_, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogInformation("[Angular] {Line}", e.Data);
        };

        _process.ErrorDataReceived += (_, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogWarning("[Angular] {Line}", e.Data);
        };

        _process.Start();
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();

        _logger.LogInformation("Angular dev server starting at http://localhost:4200 (PID {Pid})", _process.Id);

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (_process is { HasExited: false })
        {
            _process.Kill(entireProcessTree: true);
            _process.Dispose();
            _logger.LogInformation("Angular dev server stopped.");
        }

        return Task.CompletedTask;
    }
}
