import { Controller, Get, Route } from 'tsoa';

export interface HealthStatus {
  status: 'ok';
}

@Route('health')
export class HealthController extends Controller {
  @Get()
  public async getHealth(): Promise<HealthStatus> {
    return { status: 'ok' };
  }
}
