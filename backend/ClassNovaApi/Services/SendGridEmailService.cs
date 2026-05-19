using SendGrid;
using SendGrid.Helpers.Mail;

namespace ClassNovaApi.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SendGridEmailService> _logger;

        public SendGridEmailService(IConfiguration config, ILogger<SendGridEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendOtpAsync(string toEmail, string fullName, string otp)
        {
            var apiKey    = _config["SendGrid:ApiKey"]
                ?? throw new InvalidOperationException("SendGrid API key is not configured.");
            var fromEmail = _config["SendGrid:FromEmail"]
                ?? throw new InvalidOperationException("SendGrid sender email is not configured.");
            var fromName  = _config["SendGrid:FromName"] ?? "ClassNova";

            var client  = new SendGridClient(apiKey);
            var from    = new EmailAddress(fromEmail, fromName);
            var to      = new EmailAddress(toEmail, fullName);
            var subject = "Your ClassNova verification code";

            var plainText = $"Hi {fullName},\n\nYour verification code is: {otp}\n\nThis code expires in 15 minutes. Do not share it with anyone.";
            var htmlBody  = $"""
                <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                  <h2 style="color:#1a1a2e;">Verify your email</h2>
                  <p>Hi {fullName},</p>
                  <p>Enter the code below to verify your ClassNova account:</p>
                  <div style="font-size:2rem;font-weight:700;letter-spacing:0.3rem;
                              background:#f4f6f9;padding:1rem 1.5rem;border-radius:8px;
                              text-align:center;color:#1a1a2e;margin:1.5rem 0;">
                    {otp}
                  </div>
                  <p style="color:#6b7280;font-size:0.85rem;">
                    This code expires in <strong>15 minutes</strong>.<br/>
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </div>
                """;

            var message = MailHelper.CreateSingleEmail(from, to, subject, plainText, htmlBody);
            var response = await client.SendEmailAsync(message);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid delivery failed. Status: {Status}, Body: {Body}",
                    response.StatusCode, body);
                throw new InvalidOperationException("Failed to send verification email.");
            }

            _logger.LogInformation("OTP email sent via SendGrid to {Email}", toEmail);
        }

        public async Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp)
        {
            var apiKey    = _config["SendGrid:ApiKey"]
                ?? throw new InvalidOperationException("SendGrid API key is not configured.");
            var fromEmail = _config["SendGrid:FromEmail"]
                ?? throw new InvalidOperationException("SendGrid sender email is not configured.");
            var fromName  = _config["SendGrid:FromName"] ?? "ClassNova";

            var client  = new SendGridClient(apiKey);
            var from    = new EmailAddress(fromEmail, fromName);
            var to      = new EmailAddress(toEmail, fullName);
            var subject = "Reset your ClassNova password";

            var plainText = $"Hi {fullName},\n\nYour password reset code is: {otp}\n\nThis code expires in 15 minutes. If you did not request a password reset, please ignore this email.";
            var htmlBody  = $"""
                <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                  <h2 style="color:#1a1a2e;">Reset your password</h2>
                  <p>Hi {fullName},</p>
                  <p>Enter the code below to reset your ClassNova password:</p>
                  <div style="font-size:2rem;font-weight:700;letter-spacing:0.3rem;
                              background:#f4f6f9;padding:1rem 1.5rem;border-radius:8px;
                              text-align:center;color:#1a1a2e;margin:1.5rem 0;">
                    {otp}
                  </div>
                  <p style="color:#6b7280;font-size:0.85rem;">
                    This code expires in <strong>15 minutes</strong>.<br/>
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </div>
                """;

            var message  = MailHelper.CreateSingleEmail(from, to, subject, plainText, htmlBody);
            var response = await client.SendEmailAsync(message);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid password reset delivery failed. Status: {Status}, Body: {Body}",
                    response.StatusCode, body);
                throw new InvalidOperationException("Failed to send password reset email.");
            }

            _logger.LogInformation("Password reset OTP sent via SendGrid to {Email}", toEmail);
        }
    }
}
