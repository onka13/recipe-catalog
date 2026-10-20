using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

public sealed record HealthStatus(string Status);

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthStatus> Get() => new HealthStatus("ok");
}
