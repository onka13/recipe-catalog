using System.ComponentModel.DataAnnotations;

namespace Api.Core.Configuration;

/// <summary>
/// The API's own settings (section "Api"), bound and validated at startup: a missing or invalid value stops the app
/// before it serves a request. Read them through IOptions&lt;ApiOptions&gt;, never through IConfiguration in services.
/// </summary>
public sealed class ApiOptions
{
    public const string Section = "Api";

    [Required]
    public string ServiceName { get; init; } = string.Empty;
}
