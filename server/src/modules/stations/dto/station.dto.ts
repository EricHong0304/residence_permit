import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStationDto {
  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  short_name?: string;

  @IsOptional()
  remark?: string;
}
