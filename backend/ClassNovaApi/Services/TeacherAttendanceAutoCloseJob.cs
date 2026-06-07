using ClassNovaApi.Data;

namespace ClassNovaApi.Services
{
    // Runs hourly. For each tenant, closes any open teacher check-in whose date
    // has already ended in that tenant's local timezone.
    public class TeacherAttendanceAutoCloseJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TeacherAttendanceAutoCloseJob> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

        public TeacherAttendanceAutoCloseJob(
            IServiceScopeFactory scopeFactory,
            ILogger<TeacherAttendanceAutoCloseJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("TeacherAttendanceAutoCloseJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await RunAsync(stoppingToken);
                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task RunAsync(CancellationToken stoppingToken)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<TeacherAttendanceService>();
                await service.AutoCloseOpenRecordsAsync();
            }
            catch (OperationCanceledException)
            {
                // Shutdown — expected
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TeacherAttendanceAutoCloseJob failed.");
            }
        }
    }
}
