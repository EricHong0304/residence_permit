import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  async daily(from?: string, to?: string, stationId?: number) {
    const days = 7;
    const today = new Date();
    const data = Array.from({ length: days }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const day = d.toISOString().slice(0, 10);
      return {
        day,
        station_id: stationId || null,
        permit_count: Math.floor(Math.random() * 20) + 1,
        exception_count: Math.floor(Math.random() * 5),
      };
    });

    return { from, to, stationId, data };
  }
}
