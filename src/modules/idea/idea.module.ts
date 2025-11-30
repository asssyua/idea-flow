import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { Topic } from '../../entities/topic.entity';
import { UserReaction } from '../../entities/user-reaction.entity';
import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Idea, Comment, Topic, UserReaction]),
    AuthModule,
  ],
  controllers: [IdeaController],
  providers: [IdeaService],
  exports: [IdeaService],
})
export class IdeaModule {}