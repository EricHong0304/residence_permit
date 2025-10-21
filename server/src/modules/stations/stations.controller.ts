import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/station.dto';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  async list(@Query() query: PaginationQueryDto) {
    return this.stationsService.list(query);
  }

  @Post()
  async create(@Body() dto: CreateStationDto) {
    return this.stationsService.create(dto);
  }
}
