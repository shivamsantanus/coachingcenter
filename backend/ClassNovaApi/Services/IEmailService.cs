namespace ClassNovaApi.Services
{
    public interface IEmailService
    {
        Task SendOtpAsync(string toEmail, string fullName, string otp);
    }
}
