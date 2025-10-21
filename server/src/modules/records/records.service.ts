import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class RecordsService {
  private items = [
    { id: 1, station_id: 1, apply_date: new Date().toISOString().slice(0, 10), status: 'success' },
    { id: 2, station_id: 1, apply_date: new Date().toISOString().slice(0, 10), status: 'exception' },
  ];

  async list(query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    return {
      data: this.items.slice((page - 1) * pageSize, page * pageSize),
      total: this.items.length,
      page,
      pageSize,
    };
  }
}
