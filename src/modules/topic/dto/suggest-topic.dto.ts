import { IsString, IsNotEmpty } from 'class-validator';

export class SuggestTopicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}