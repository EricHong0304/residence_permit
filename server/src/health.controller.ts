import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  get(): string {
    return 'ok';
  }
}
