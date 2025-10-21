import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RecordsService } from './records.service';

@Controller('records')
export class RecordsController {
  constructor(private readonly service: RecordsService) {}

  @Get()
  async list(@Query() query: PaginationQueryDto) {
    return this.service.list(query);
  }
}
