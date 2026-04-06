
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from '../../entities/topic.entity';
import { TopicFavorite } from '../../entities/topic-favorite.entity';
import { TopicService } from './topic.service';
import { TopicController } from './topic.controller';
import { AuthModule } from '../auth/auth.module';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, TopicFavorite]),
    AuthModule,
    BadgeModule,
  ],
  controllers: [TopicController],
  providers: [TopicService],
  exports: [TopicService],
})
export class TopicModule {}