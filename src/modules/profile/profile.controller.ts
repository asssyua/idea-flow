import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { UserStatus } from '../../enums/user/user-status.enum';
import { User } from '../../entities/user.entity';

@Controller('profile') 
export class ProfileController {
  
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    const profile = this.formatProfileResponse(user);
    return { 
      user: profile 
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminProfile(@GetUser() user: User) {
    const profile = this.formatProfileResponse(user);
    return { 
      message: 'Admin profile information',
      user: profile,
      adminData: {
        totalUsers: 'You have access to admin dashboard',
        systemStats: 'View all system statistics'
      }
    };
  }

  @Get('block-info')
  @UseGuards(JwtAuthGuard)
  getBlockInfo(@GetUser() user: User) {
    if (user.status !== UserStatus.BLOCKED) {
      return { 
        isBlocked: false,
        message: 'Your account is active' 
      };
    }

    return {
      isBlocked: true,
      blockedAt: user.blockedAt,
      blockReason: user.blockReasonForUser,
      contactSupport: 'If you believe this is a mistake, please contact support at support@ideaflow.com'
    };
  }

  private formatProfileResponse(user: User): any {
    const roleValue = user.role ? (typeof user.role === 'string' ? user.role : String(user.role)) : null;
    
    const baseProfile = {
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      email: user.email,
      role: roleValue || user.role,
    };

    if (user.status === UserStatus.BLOCKED) {
      return {
        ...baseProfile,
        blockInfo: {
          blockedAt: user.blockedAt,
          blockReason: user.blockReasonForUser,
          contactSupport: 'Please contact support for assistance'
        }
      };
    }

    return baseProfile;
  }
}