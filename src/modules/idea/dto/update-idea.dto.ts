import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateIdeaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
