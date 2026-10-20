namespace Api.Core.Errors;

/// <summary>An expected failure with its HTTP status; AppExceptionHandler turns it into a problem details response.</summary>
public abstract class AppException(string message, int statusCode, string title) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    public string Title { get; } = title;
}

public sealed class InvalidInputException(string message) : AppException(message, StatusCodes.Status400BadRequest, "Invalid input");

public sealed class ForbiddenException(string message) : AppException(message, StatusCodes.Status403Forbidden, "Forbidden");

public sealed class NotFoundException(string entity, string id) : AppException($"{entity} {id} was not found.", StatusCodes.Status404NotFound, "Not found");

public sealed class ConflictException(string message) : AppException(message, StatusCodes.Status409Conflict, "Conflict");
