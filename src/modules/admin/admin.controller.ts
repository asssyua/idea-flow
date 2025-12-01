import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { AdminService } from './admin.service';
import { BlockUserDto } from './dto/block-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getAllUsers() {
    console.log('GET /admin/users called');
    return this.adminService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    console.log(`GET /admin/users/${id} called`);
    return this.adminService.getUserById(id);
  }

  @Patch(':id/block')
  async blockUser(@Param('id') id: string, @Body() dto: BlockUserDto) {
    console.log(`PATCH /admin/users/${id}/block called`);
    return this.adminService.blockUser(id, dto);
  }

  @Patch(':id/unblock')
  async unblockUser(@Param('id') id: string) {
    console.log(`PATCH /admin/users/${id}/unblock called`);
    return this.adminService.unblockUser(id);
  }
}