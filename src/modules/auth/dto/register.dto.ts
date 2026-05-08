import { IsEmail, IsString, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @IsString()
  @MaxLength(100, { message: 'Пароль не должен превышать 100 символов' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Пароль должен содержать не менее 1 заглавной и не менее 1 строчной буквы'
  })
  @Matches(/(?=.*\d)?/, {
    message: 'Пароль должен содержать хотя бы одну цифру'
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[a-zA-Zа-яА-ЯёЁ]+$/, {
    message: 'Имя может содержать только буквы'
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[a-zA-Zа-яА-ЯёЁ]+$/, {
    message: 'Фамилия может содержать только буквы'
  })
  lastName: string;
}