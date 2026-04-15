import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { UserStatus } from '../../enums/user/user-status.enum';
import { User } from '../../entities/user.entity';
import { BadgeService } from '../badge/badge.service';

@Controller('profile') 
export class ProfileController {
  constructor(private readonly badgeService: BadgeService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: User) {
    const badges = await this.badgeService.getBadgesForDisplay(user.id);
    const profile = this.formatProfileResponse(user, badges);
    return { 
      user: profile 
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminProfile(@GetUser() user: User) {
    const badges = await this.badgeService.getBadgesForDisplay(user.id);
    const profile = this.formatProfileResponse(user, badges);
    return { 
      message: 'Страница администратора',
      user: profile,
      adminData: {
        totalUsers: 'У вас есть доступ к панели управления администратора',
        systemStats: 'Просмотр всей системной статистики'
      }
    };
  }

  @Get('block-info')
  @UseGuards(JwtAuthGuard)
  getBlockInfo(@GetUser() user: User) {
    if (user.status !== UserStatus.BLOCKED) {
      return { 
        isBlocked: false,
        message: 'Ваша учетная запись активна' 
      };
    }

    return {
      isBlocked: true,
      blockedAt: user.blockedAt,
      blockReason: user.blockReasonForUser,
      contactSupport: 'Если вы считаете, что это ошибка, пожалуйста, свяжитесь со службой поддержки по адресу admin@ideaflow.com'
    };
  }

  private formatProfileResponse(user: User, badges?: unknown[]): any {
    const roleValue = user.role ? (typeof user.role === 'string' ? user.role : String(user.role)) : null;
    
    const baseProfile = {
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      email: user.email,
      role: roleValue || user.role,
      badges: badges ?? [],
    };

    if (user.status === UserStatus.BLOCKED) {
      return {
        ...baseProfile,
        blockInfo: {
          blockedAt: user.blockedAt,
          blockReason: user.blockReasonForUser,
          contactSupport: 'Пожалуйста, обратитесь за помощью в службу поддержки'
        }
      };
    }

    return baseProfile;
  }
}