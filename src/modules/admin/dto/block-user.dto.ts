import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string; 

  @IsString()
  @IsOptional() 
  reasonForUser?: string; 
}