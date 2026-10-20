var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();

/// <summary>Lets the test project start the app with WebApplicationFactory.</summary>
public partial class Program;
