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

    this.logger.log(`Registration attempt for: ${email}`);

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

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

    const emailSent = await this.emailService.sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      throw new BadRequestException('Failed to send verification email');
    }

    this.logger.log(`User registered successfully: ${email}`);
    return { 
      message: 'Registration successful. Please check your email for verification code.'
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ access_token: string }> {
  const { email, code } = verifyEmailDto;

  const user = await this.userRepository.findOne({ 
    where: { email } 
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (user.isEmailVerified) {
    throw new BadRequestException('Email already verified');
  }

  if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
    throw new BadRequestException('Verification code not found or expired');
  }

  if (user.emailVerificationCode !== code) {
    throw new BadRequestException('Invalid verification code');
  }

  if (user.emailVerificationCodeExpires < new Date()) {
    throw new BadRequestException('Verification code has expired');
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
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = verificationCodeExpires;
    
    await this.userRepository.save(user);

    const emailSent = await this.emailService.sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      throw new BadRequestException('Failed to send verification email');
    }

    return { 
      message: 'Verification code sent successfully' 
    };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
  const { email, password } = loginDto;

  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  if (user.status === UserStatus.BLOCKED) {
    const blockMessage = user.blockReasonForUser 
      ? `Your account has been blocked. Reason: ${user.blockReasonForUser}. Please contact support.`
      : 'Your account has been blocked. Please contact support.';
    throw new ForbiddenException(blockMessage);
  }

  if (!user.isEmailVerified) {
    throw new ForbiddenException('Please verify your email first');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
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
    this.logger.log(`Password reset requested for: ${email}`);

    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return { 
        message: 'If the email exists, a password reset link has been sent.' 
      };
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Account is blocked');
    }

    const resetToken = this.generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = resetTokenExpires;
    
    await this.userRepository.save(user);

    try {
      const emailSent = await this.emailService.sendPasswordResetEmail(email, resetToken);
      
      if (!emailSent) {
        throw new BadRequestException('Failed to send password reset email');
      }

      this.logger.log(`Password reset email sent to: ${email}`);
      
    } catch (emailError) {
      this.logger.error(`Failed to send password reset email to ${email}:`, emailError);
    }

    return { 
      message: 'If the email exists, a password reset link has been sent.' 
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    const user = await this.userRepository.findOne({ 
      where: { passwordResetToken: token } 
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.passwordResetTokenExpires || user.passwordResetTokenExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Account is blocked');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    
    await this.userRepository.save(user);

    this.logger.log(`Password successfully reset for user: ${user.email}`);
    return { 
      message: 'Password has been successfully reset.' 
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user: ${user.email}`);
    return { 
      message: 'Password has been successfully changed.' 
    };
  }

async validateUser(email: string, password: string): Promise<any> {
  const user = await this.userRepository.findOne({ where: { email } });
  
  if (user && await bcrypt.compare(password, user.password)) {

    if (user.status === UserStatus.BLOCKED) {
      const blockMessage = user.blockReasonForUser 
        ? `Your account has been blocked. Reason: ${user.blockReasonForUser}. Please contact support.`
        : 'Your account has been blocked. Please contact support.';
      throw new ForbiddenException(blockMessage);
    }
    
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Please verify your email address before logging in.');
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