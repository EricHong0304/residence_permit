import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('daily')
  async daily(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.service.daily(from, to, stationId ? Number(stationId) : undefined);
  }
}
