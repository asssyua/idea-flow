import { PartialType } from '@nestjs/mapped-types';
import { CreateTopicDto } from './create-topic.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TopicStatus } from '../../../enums/topic/topic-status.enum';
import { TopicPrivacy } from '../../../enums/topic/topic-privacy.enum';

export class UpdateTopicDto extends PartialType(CreateTopicDto) {
  @IsOptional()
  @IsEnum(TopicStatus)
  status?: TopicStatus;

  @IsOptional()
  @IsEnum(TopicPrivacy)
  privacy?: TopicPrivacy;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}