namespace ClassNovaApi.Services
{
    public interface IEmailService
    {
        Task SendOtpAsync(string toEmail, string fullName, string otp);
        Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp);
    }
}
