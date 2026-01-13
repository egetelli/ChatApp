using System;

namespace API.Common;

public class Response<T>
{
    public bool IsSuccess { get; }
    public T? Data { get; }
    public string? Error { get; set; }
    public string? Message { get; set; }


    public Response(bool isSuccess, T? data, string? error, string? message)
    {
        IsSuccess = isSuccess;
        Data = data;
        Error = error;
        Message = message;
    }

    // Başarılı olduğunda sadece datayı verip geçersin:
    public static Response<T> Success(T data, string? message = null)
    {
        return new Response<T>(true, data, null, message);
    }

    // Hata olduğunda sadece mesajı verip geçersin:
    public static Response<T> Failure(string error, string? message = null)
    {
        return new Response<T>(false, default, error, message);
    }
}
