import { IsEmail, IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Код верификации не менее 6 символов' })
  code: string;
}