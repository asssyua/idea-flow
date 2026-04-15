import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBadge } from '../../entities/user-badge.entity';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { Topic } from '../../entities/topic.entity';
import { BadgeService } from './badge.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserBadge, Idea, Comment, Topic])],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}
