namespace ClassNovaApi.Services
{
    public class ConsoleEmailService : IEmailService
    {
        private readonly ILogger<ConsoleEmailService> _logger;

        public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
        {
            _logger = logger;
        }

        public Task SendOtpAsync(string toEmail, string fullName, string otp)
        {
            _logger.LogInformation(
                "[DEV EMAIL] To: {Email} | Name: {Name} | OTP: {Otp}",
                toEmail, fullName, otp);

            return Task.CompletedTask;
        }
    }
}
