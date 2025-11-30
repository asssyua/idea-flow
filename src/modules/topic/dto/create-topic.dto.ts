import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TopicPrivacy } from '../../../enums/topic/topic-privacy.enum';

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(TopicPrivacy)
  privacy?: TopicPrivacy;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}