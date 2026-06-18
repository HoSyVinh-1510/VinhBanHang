namespace BaseCore.Services.Models
{
    public class ServiceResult
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }

        public static ServiceResult Success(object? data = null, string message = "") => 
            new() { IsSuccess = true, Message = message, Data = data };

        public static ServiceResult Error(string message) => 
            new() { IsSuccess = false, Message = message };
    }

    public class ServiceResult<T> : ServiceResult
    {
        public new T? Data { get; set; }

        public static ServiceResult<T> Success(T data, string message = "") => 
            new() { IsSuccess = true, Message = message, Data = data };

        public static new ServiceResult<T> Error(string message) => 
            new() { IsSuccess = false, Message = message, Data = default };
    }
}
