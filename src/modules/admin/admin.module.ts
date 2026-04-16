import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { SupportMessage } from '../../entities/support-message.entity';
import { Topic } from '../../entities/topic.entity';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({
    imports: [
    TypeOrmModule.forFeature([User, SupportMessage, Topic, Idea, Comment])
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
