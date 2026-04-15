import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}