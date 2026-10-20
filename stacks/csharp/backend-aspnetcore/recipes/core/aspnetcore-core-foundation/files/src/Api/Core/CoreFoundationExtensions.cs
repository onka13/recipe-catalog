using Api.Core.Configuration;
using Api.Core.Errors;

namespace Api.Core;

public static class CoreFoundationExtensions
{
    /// <summary>Problem details for every error, validated typed settings and health checks.</summary>
    public static IServiceCollection AddCoreFoundation(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddProblemDetails();
        services.AddExceptionHandler<AppExceptionHandler>();
        services.AddOptions<ApiOptions>()
            .Bind(configuration.GetSection(ApiOptions.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddHealthChecks();
        return services;
    }

    /// <summary>The exception handler first, problem details for bare status codes, and GET /health/ready.</summary>
    public static WebApplication UseCoreFoundation(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.MapHealthChecks("/health/ready");
        return app;
    }
}
