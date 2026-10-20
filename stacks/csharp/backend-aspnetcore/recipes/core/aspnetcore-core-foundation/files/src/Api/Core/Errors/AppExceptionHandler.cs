using Microsoft.AspNetCore.Diagnostics;

namespace Api.Core.Errors;

/// <summary>
/// Every exception becomes an RFC 9457 problem details response. An AppException keeps its status and message; any
/// other exception is logged and answered with 500 and no internal detail.
/// </summary>
public sealed class AppExceptionHandler(IProblemDetailsService problemDetails, ILogger<AppExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title, detail) = exception is AppException app
            ? (app.StatusCode, app.Title, app.Message)
            : (StatusCodes.Status500InternalServerError, "An unexpected error occurred.", null);
        if (exception is not AppException)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = { Status = status, Title = title, Detail = detail },
        });
    }
}
