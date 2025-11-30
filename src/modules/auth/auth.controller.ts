import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UnauthorizedException, 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import type { Request } from 'express'; 

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerificationCode(resendVerificationDto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    await this.authService.logout(token);
    return { message: 'Successfully logged out' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const userId = (req.user as any).id;
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTest() {
    return { 
      message: 'This endpoint is for admins only!',
      timestamp: new Date().toISOString()
    };
  }

  @Get('user-test') 
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  async userTest() {
    return {
      message: 'This endpoint is for users and admins!',
      timestamp: new Date().toISOString()
    };
  }
}