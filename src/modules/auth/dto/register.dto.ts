import { IsEmail, IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase and one lowercase letter'
  })
  @Matches(/(?=.*\d)?/, {
    message: 'Password should contain at least one digit'
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[a-zA-Zа-яА-ЯёЁ]+$/, {
    message: 'First name can only contain letters'
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[a-zA-Zа-яА-ЯёЁ]+$/, {
    message: 'Last name can only contain letters'
  })
  lastName: string;
}