import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateStationDto } from './dto/station.dto';

@Injectable()
export class StationsService {
  private items = [
    { id: 1, code: 'PS001', name: '第一派出所', short_name: '一所', active: 1 },
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

  async create(dto: CreateStationDto) {
    const id = this.items.length + 1;
    const item = { id, ...dto, active: 1 } as any;
    this.items.push(item);
    return item;
  }
}
