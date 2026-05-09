namespace ClassNovaApi.Models
{
    public class ApiResponse<T>
    {
        public bool Success { get; }
        public T? Data { get; }
        public string? Error { get; }

        public ApiResponse(T? data)
        {
            Success = true;
            Data = data;
            Error = null;
        }

        public ApiResponse(T? data, string error)
        {
            Success = false;
            Data = data;
            Error = error;
        }
    }
}
