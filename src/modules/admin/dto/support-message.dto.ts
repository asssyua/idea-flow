import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class SupportMessageDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  blockReason?: string;
}




