import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { RevokedToken } from '../../entities/revoked-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { UserStatus } from '../../enums/user/user-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RevokedToken)
    private revokedTokenRepository: Repository<RevokedToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, firstName, lastName } = registerDto;

    this.logger.log(`Попытка регистрации для: ${email}`);

    const existingUser = await this.userRepository.findOne({ where: { email } });

    // Если пользователь существует и уже верифицирован - ошибка
    if (existingUser && existingUser.isEmailVerified) {
      throw new ConflictException('Пользователь с такой почтой уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    if (existingUser && !existingUser.isEmailVerified) {
      // Обновляем существующего неподтверждённого пользователя
      this.logger.log(`Обновление неподтверждённого пользователя: ${email}`);

      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.password = hashedPassword;
      existingUser.emailVerificationCode = verificationCode;
      existingUser.emailVerificationCodeExpires = verificationCodeExpires;

      await this.userRepository.save(existingUser);
    } else {
      // Создаём нового пользователя
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        status: UserStatus.PENDING,
        emailVerificationCode: verificationCode,
        emailVerificationCodeExpires: verificationCodeExpires,
        isEmailVerified: false,
      });

      await this.userRepository.save(user);
    }

    const emailSent = await this.emailService.sendVerificationEmail(email, verificationCode);

    if (!emailSent) {
      this.logger.error(`Ошибка отправки email на ${email}. Проверьте логи EmailService.`);
      throw new BadRequestException('Не удалось отправить код верификации. Возможные причины: 1) Не настроены EMAIL_USER/EMAIL_PASS в .env, 2) Неверный App Password для Gmail, 3) Проблемы с подключением к SMTP. Проверьте консоль backend для деталей.');
    }

    this.logger.log(`Регистрация успешна: ${email}`);
    return {
      message: 'Регистрация прошла успешно. Пожалуйста, проверьте свой адрес электронной почты для получения кода подтверждения.'
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ access_token: string }> {
  const { email, code } = verifyEmailDto;

  const user = await this.userRepository.findOne({ 
    where: { email } 
  });

  if (!user) {
    throw new UnauthorizedException('Пользователь не найден');
  }

  if (user.isEmailVerified) {
    throw new BadRequestException('Email верифицирован');
  }

  if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
    throw new BadRequestException('Проверочный код не найден или срок действия истек');
  }

  if (user.emailVerificationCode !== code) {
    throw new BadRequestException('Не верный код верификации');
  }

  if (user.emailVerificationCodeExpires < new Date()) {
    throw new BadRequestException('Срок действия проверочного кода истек');
  }

  user.status = UserStatus.ACTIVE;
  user.isEmailVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationCodeExpires = null;
  
  await this.userRepository.save(user);

  const payload = { 
    email: user.email, 
    sub: user.id, 
    role: user.role,
    verified: user.isEmailVerified,
    jti: uuidv4()
  };
  
  return {
    access_token: this.jwtService.sign(payload),
  };
}

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email подтверждён');
    }

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = verificationCodeExpires;
    
    await this.userRepository.save(user);

    const emailSent = await this.emailService.sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      throw new BadRequestException('Не удалось отправить код верификации');
    }

    return { 
      message: 'Код верификации отправлен' 
    };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
  const { email, password } = loginDto;

  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedException('Неверные данные');
  }

  if (user.status === UserStatus.BLOCKED) {
    const blockMessage = user.blockReasonForUser 
      ? `Ваш аккаунт был заблокирован. Причина: ${user.blockReasonForUser}. Пожалуйста обратитесь в поддержку.`
      : 'Ваш аккаунт был заблокирован. Пожалуйста обратитесь в поддержку.';
    throw new ForbiddenException(blockMessage);
  }

  if (!user.isEmailVerified) {
    throw new ForbiddenException('Пожалуйста подствердите ваш email');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Неверные данные');
  }

  const payload = { 
    email: user.email, 
    sub: user.id, 
    role: user.role, 
    jti: uuidv4(),  
    verified: user.isEmailVerified 
  };

  return {
    access_token: this.jwtService.sign(payload),
  };
}

  async forgotPassword(email: string): Promise<{ message: string }> {
    this.logger.log(`Запрошен сброс пароля для: ${email}`);

    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      this.logger.log(`Запрошен сброс пароля для несуществующего адреса электронной почты: ${email}`);
      return { 
        message: 'Если электронный адрес существует, вам будет отправлена ссылка для сброса пароля.' 
      };
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Аккаунт заблокирован');
    }

    const resetToken = this.generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = resetTokenExpires;
    
    await this.userRepository.save(user);

    try {
      const emailSent = await this.emailService.sendPasswordResetEmail(email, resetToken);
      
      if (!emailSent) {
        throw new BadRequestException('Не удалось отправить электронное письмо для сброса пароля');
      }

      this.logger.log(`Электронное письмо для сброса пароля, отправленное на адрес: ${email}`);
      
    } catch (emailError) {
      this.logger.error(`Не удалось отправить электронное письмо для сброса пароля  ${email}:`, emailError);
    }

    return { 
      message: 'Если это электронный адрес существует, вам будет отправлена ссылка для сброса пароля.' 
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    const user = await this.userRepository.findOne({ 
      where: { passwordResetToken: token } 
    });

    if (!user) {
      throw new BadRequestException('Недействительный или просроченный токен сброса');
    }

    if (!user.passwordResetTokenExpires || user.passwordResetTokenExpires < new Date()) {
      throw new BadRequestException('Срок действия токена сброса истек');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Аккаунт заблокирован');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    
    await this.userRepository.save(user);

    this.logger.log(`Пароль успешно сброшен для пользователя: ${user.email}`);
    return { 
      message: 'Пароль успешно обновлён.' 
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Текущий пароль неверен');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    
    await this.userRepository.save(user);

    this.logger.log(`Пароль изменен для пользователя: ${user.email}`);
    return { 
      message: 'Пароль успешно изменен.' 
    };
  }

async validateUser(email: string, password: string): Promise<any> {
  const user = await this.userRepository.findOne({ where: { email } });
  
  if (user && await bcrypt.compare(password, user.password)) {

    if (user.status === UserStatus.BLOCKED) {
      const blockMessage = user.blockReasonForUser 
       ? `Ваш аккаунт был заблокирован. Причина: ${user.blockReasonForUser}. Пожалуйста обратитесь в поддержку.`
      : 'Ваш аккаунт был заблокирован. Пожалуйста обратитесь в поддержку.';
      throw new ForbiddenException(blockMessage);
    }
    
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Пожалуйста, подтвердите свой адрес электронной почты перед входом в систему.');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
  return null;
}

  async logout(token: string): Promise<void> {
    const payload = this.jwtService.decode(token) as any;
    if (!payload?.exp || !payload?.jti) return;

    const revokedToken = this.revokedTokenRepository.create({
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    });
    await this.revokedTokenRepository.save(revokedToken);
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const revokedToken = await this.revokedTokenRepository.findOne({ where: { jti } });
    return !!revokedToken;
  }


  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateResetToken(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
  }
}