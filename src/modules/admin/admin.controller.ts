import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { AdminService } from './admin.service';
import { BlockUserDto } from './dto/block-user.dto';
import { SupportMessageDto } from './dto/support-message.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('support-message')
  async sendSupportMessage(@Body() dto: SupportMessageDto) {
    return this.adminService.sendSupportMessage(dto.email, dto.message, dto.blockReason);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    console.log('GET /admin/users called');
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    console.log(`GET /admin/users/${id} called`);
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async blockUser(@Param('id') id: string, @Body() dto: BlockUserDto) {
    console.log(`PATCH /admin/users/${id}/block called`);
    return this.adminService.blockUser(id, dto);
  }

  @Patch('users/:id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unblockUser(@Param('id') id: string) {
    console.log(`PATCH /admin/users/${id}/unblock called`);
    return this.adminService.unblockUser(id);
  }

  @Get('support-messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllSupportMessages() {
    return this.adminService.getAllSupportMessages();
  }

  @Patch('support-messages/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async markSupportMessageAsRead(@Param('id') id: string) {
    return this.adminService.markSupportMessageAsRead(id);
  }
}