import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не менее 8 символов' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Пароль должен содержать не менее 1 заглавной и не менее 1 строчной буквы'
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}