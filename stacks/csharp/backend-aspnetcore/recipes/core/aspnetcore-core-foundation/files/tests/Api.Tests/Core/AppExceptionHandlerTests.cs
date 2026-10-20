using Api.Core.Errors;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Core;

public sealed class AppExceptionHandlerTests
{
    private static async Task<HttpContext> Handle(Exception exception)
    {
        var services = new ServiceCollection().AddLogging().AddProblemDetails().BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        context.Response.Body = new MemoryStream();
        var handler = new AppExceptionHandler(services.GetRequiredService<IProblemDetailsService>(), NullLogger<AppExceptionHandler>.Instance);
        Assert.True(await handler.TryHandleAsync(context, exception, CancellationToken.None));
        return context;
    }

    private static string Body(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return new StreamReader(context.Response.Body).ReadToEnd();
    }

    [Fact]
    public async Task An_app_exception_keeps_its_status_and_message()
    {
        var context = await Handle(new NotFoundException("Order", "42"));

        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        Assert.Contains("Order 42 was not found.", Body(context));
    }

    [Fact]
    public async Task Any_other_exception_is_a_500_without_its_message()
    {
        var context = await Handle(new InvalidOperationException("connection string secret"));

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.DoesNotContain("connection string secret", Body(context));
    }
}
