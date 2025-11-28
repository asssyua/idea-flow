import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase and one lowercase letter'
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}