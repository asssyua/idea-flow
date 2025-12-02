import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { SupportMessage } from '../../entities/support-message.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({
    imports: [
    TypeOrmModule.forFeature([User, SupportMessage])
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
