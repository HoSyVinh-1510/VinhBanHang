using System.Diagnostics;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BaseCore.APIService.BackgroundJobs
{
    public class RubyPromotionsRunner : BackgroundService
    {
        private readonly ILogger<RubyPromotionsRunner> _logger;
        private Process? _rubyProcess;

        public RubyPromotionsRunner(ILogger<RubyPromotionsRunner> logger)
        {
            _logger = logger;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _logger.LogInformation("Starting Ruby Promotions Service...");

                // Sử dụng trực tiếp đường dẫn cố định đến thư mục dự án Ruby
                string workingDir = @"D:\FW\FW\BaseCore\BaseCore.PromotionsService";
                string scriptPath = Path.Combine(workingDir, "app.rb");

                var startInfo = new ProcessStartInfo
                {
                    FileName = "ruby",
                    Arguments = $"\"{scriptPath}\"",
                    WorkingDirectory = workingDir,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                _rubyProcess = new Process { StartInfo = startInfo };

                // Lắng nghe log đầu ra và chuyển tiếp về logger của C#
                _rubyProcess.OutputDataReceived += (s, e) => { if (e.Data != null) _logger.LogInformation($"[Ruby]: {e.Data}"); };
                _rubyProcess.ErrorDataReceived += (s, e) => { if (e.Data != null) _logger.LogError($"[Ruby Error]: {e.Data}"); };

                _rubyProcess.Start();
                _rubyProcess.BeginOutputReadLine();
                _rubyProcess.BeginErrorReadLine();

                _logger.LogInformation($"Ruby API started successfully on Port 5003 (PID: {_rubyProcess.Id})");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start Ruby API. Make sure Ruby is installed and in your environment PATH.");
            }

            return Task.CompletedTask;
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_rubyProcess != null && !_rubyProcess.HasExited)
            {
                _logger.LogInformation("Stopping Ruby Promotions Service...");
                try
                {
                    _rubyProcess.Kill(entireProcessTree: true); // Tắt sạch tiến trình con để giải phóng cổng
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to terminate Ruby process.");
                }
            }

            await base.StopAsync(cancellationToken);
        }
    }
}
