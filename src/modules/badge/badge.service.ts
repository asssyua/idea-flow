import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadge } from '../../entities/user-badge.entity';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { Topic } from '../../entities/topic.entity';
import { UserReaction } from '../../entities/user-reaction.entity';
import { BadgeType } from '../../enums/badge/badge-type.enum';
import { TopicStatus } from '../../enums/topic/topic-status.enum';
import { ReactionType } from '../../enums/reactions-type.enum';

export interface BadgeDisplayDto {
  type: BadgeType;
  level: number;
  title: string;
  description: string;
  tierLabel: string;
  color: string;
  firstEarnedAt: string;
}

const COMMENT_THRESHOLDS = [10, 50, 100] as const;
const POPULAR_THRESHOLDS = [50, 100, 500] as const;
const TOTAL_LIKES_THRESHOLDS = [100, 500, 1000] as const;

const COMMENT_GURU_COLORS = ['#CD7F32', '#A8A8A8', '#FFD700'];
const POPULAR_AUTHOR_COLORS = ['#5B8DEF', '#9B59B6', '#E74C3C'];
const TOTAL_LIKES_COLORS = ['#27AE60', '#16A085', '#F39C12'];

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(UserReaction)
    private readonly userReactionRepository: Repository<UserReaction>,
  ) {}

  async getBadgesForDisplay(userId: string): Promise<BadgeDisplayDto[]> {
    await this.syncAllBadgesForUser(userId);
    const rows = await this.userBadgeRepository.find({
      where: { userId },
      order: { badgeType: 'ASC' },
    });
    return rows.map((row) => this.toDisplayDto(row));
  }

  /** Пересчёт всех показателей и уровней (вызывается при открытии профиля и после событий). */
  async syncAllBadgesForUser(userId: string): Promise<void> {
    await this.syncFirstAuthor(userId);
    await this.syncCommentGuru(userId);
    await this.syncPopularAuthor(userId);
    await this.syncTotalLikes(userId);
    await this.syncTopicMaster(userId);
    await this.syncEditorsChoice(userId);
    await this.syncIdeaGenerator(userId);
    await this.syncCommunityHeart(userId);
    await this.syncKnowItAll(userId);
  }

  async evaluateAfterIdeaCreated(userId: string): Promise<void> {
    await this.syncAllBadgesForUser(userId);
  }

  async evaluateAfterCommentAdded(userId: string): Promise<void> {
    await this.syncCommentGuru(userId);
  }

  async evaluateAfterAuthorIdeaMetricsChanged(authorId: string): Promise<void> {
    await this.syncPopularAuthor(authorId);
    await this.syncTotalLikes(authorId);
  }

  async evaluateAfterTopicApprovedOrCreated(userId: string): Promise<void> {
    await this.syncTopicMaster(userId);
  }

  async evaluateAfterIdeaPinned(userId: string): Promise<void> {
    await this.syncEditorsChoice(userId);
  }

  async evaluateAfterLikeGiven(userId: string): Promise<void> {
    await this.syncCommunityHeart(userId);
  }

  private async upsertBadge(userId: string, badgeType: BadgeType, newLevel: number): Promise<void> {
    if (newLevel <= 0) {
      return;
    }
    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeType },
    });
    if (!existing) {
      await this.userBadgeRepository.save({
        userId,
        badgeType,
        level: newLevel,
        firstEarnedAt: new Date(),
      });
      return;
    }
    if (newLevel > existing.level) {
      existing.level = newLevel;
      await this.userBadgeRepository.save(existing);
    }
  }

  private async syncFirstAuthor(userId: string): Promise<void> {
    const count = await this.ideaRepository.count({ where: { authorId: userId } });
    if (count >= 1) {
      await this.upsertBadge(userId, BadgeType.FIRST_AUTHOR, 1);
    }
  }

  private async syncCommentGuru(userId: string): Promise<void> {
    const count = await this.commentRepository.count({ where: { authorId: userId } });
    const level = this.levelFromThresholds(count, COMMENT_THRESHOLDS);
    await this.upsertBadge(userId, BadgeType.COMMENT_GURU, level);
  }

  private async syncPopularAuthor(userId: string): Promise<void> {
    const raw = await this.ideaRepository
      .createQueryBuilder('idea')
      .select('COALESCE(MAX(idea.likes), 0)', 'max')
      .where('idea.authorId = :userId', { userId })
      .getRawOne<{ max: string }>();
    const maxLikes = parseInt(raw?.max ?? '0', 10) || 0;
    const level = this.levelFromThresholds(maxLikes, POPULAR_THRESHOLDS);
    await this.upsertBadge(userId, BadgeType.POPULAR_AUTHOR, level);
  }

  private async syncTotalLikes(userId: string): Promise<void> {
    const raw = await this.ideaRepository
      .createQueryBuilder('idea')
      .select('COALESCE(SUM(idea.likes), 0)', 'sum')
      .where('idea.authorId = :userId', { userId })
      .getRawOne<{ sum: string }>();
    const total = parseInt(raw?.sum ?? '0', 10) || 0;
    const level = this.levelFromThresholds(total, TOTAL_LIKES_THRESHOLDS);
    await this.upsertBadge(userId, BadgeType.TOTAL_LIKES, level);
  }

  private async syncTopicMaster(userId: string): Promise<void> {
    const approvedCount = await this.topicRepository.count({
      where: { createdById: userId, status: TopicStatus.APPROVED },
    });
    if (approvedCount >= 5) {
      await this.upsertBadge(userId, BadgeType.TOPIC_MASTER, 1);
    }
  }

  private async syncEditorsChoice(userId: string): Promise<void> {
    const pinnedCount = await this.ideaRepository.count({
      where: { authorId: userId, isPinned: true },
    });
    if (pinnedCount >= 3) {
      await this.upsertBadge(userId, BadgeType.EDITORS_CHOICE, 1);
    }
  }

  private async syncIdeaGenerator(userId: string): Promise<void> {
    const count = await this.ideaRepository.count({ where: { authorId: userId } });
    if (count >= 10) {
      await this.upsertBadge(userId, BadgeType.IDEA_GENERATOR, 1);
    }
  }

  private async syncCommunityHeart(userId: string): Promise<void> {
    const givenLikes = await this.userReactionRepository.count({
      where: { userId, type: ReactionType.LIKE },
    });
    if (givenLikes >= 10) {
      await this.upsertBadge(userId, BadgeType.COMMUNITY_HEART, 1);
    }
  }

  private async syncKnowItAll(userId: string): Promise<void> {
    const distinctTopics = await this.commentRepository
      .createQueryBuilder('comment')
      .select('COUNT(DISTINCT idea.topicId)', 'count')
      .innerJoin('comment.idea', 'idea')
      .where('comment.authorId = :userId', { userId })
      .getRawOne<{ count: string }>();
    const count = parseInt(distinctTopics?.count ?? '0', 10) || 0;
    if (count >= 5) {
      await this.upsertBadge(userId, BadgeType.KNOW_IT_ALL, 1);
    }
  }

  private levelFromThresholds(value: number, thresholds: readonly number[]): number {
    let level = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (value >= thresholds[i]) {
        level = i + 1;
      }
    }
    return level;
  }

  private toDisplayDto(row: UserBadge): BadgeDisplayDto {
    const base = {
      type: row.badgeType as BadgeType,
      level: row.level,
      firstEarnedAt: row.firstEarnedAt.toISOString(),
    };

    switch (row.badgeType as BadgeType) {
      case BadgeType.FIRST_AUTHOR:
        return {
          ...base,
          title: 'Первый автор',
          description: 'За публикацию первой идеи',
          tierLabel: 'Уникальный',
          color: '#3498DB',
        };
      case BadgeType.COMMENT_GURU: {
        const idx = Math.min(row.level - 1, COMMENT_GURU_COLORS.length - 1);
        const threshold = COMMENT_THRESHOLDS[Math.min(row.level - 1, COMMENT_THRESHOLDS.length - 1)];
        return {
          ...base,
          title: 'Гуру комментариев',
          description: `Не менее ${threshold} комментариев`,
          tierLabel: `Уровень ${row.level} (${threshold}+)`,
          color: COMMENT_GURU_COLORS[Math.max(0, idx)],
        };
      }
      case BadgeType.POPULAR_AUTHOR: {
        const idx = Math.min(row.level - 1, POPULAR_AUTHOR_COLORS.length - 1);
        const threshold = POPULAR_THRESHOLDS[Math.min(row.level - 1, POPULAR_THRESHOLDS.length - 1)];
        return {
          ...base,
          title: 'Самый популярный автор',
          description: `Идея с ${threshold}+ лайками`,
          tierLabel: `Уровень ${row.level} (${threshold}+ лайков на идее)`,
          color: POPULAR_AUTHOR_COLORS[Math.max(0, idx)],
        };
      }
      case BadgeType.TOTAL_LIKES: {
        const idx = Math.min(row.level - 1, TOTAL_LIKES_COLORS.length - 1);
        const threshold =
          TOTAL_LIKES_THRESHOLDS[Math.min(row.level - 1, TOTAL_LIKES_THRESHOLDS.length - 1)];
        return {
          ...base,
          title: '100 лайков',
          description: 'Суммарное количество лайков на всех ваших идеях',
          tierLabel: `Уровень ${row.level} (${threshold}+ всего)`,
          color: TOTAL_LIKES_COLORS[Math.max(0, idx)],
        };
      }
      case BadgeType.TOPIC_MASTER:
        return {
          ...base,
          title: 'Мастер тем',
          description: 'За создание 5 одобренных тем',
          tierLabel: '5+ тем',
          color: '#8E44AD',
        };
      case BadgeType.EDITORS_CHOICE:
        return {
          ...base,
          title: 'Выбор редакции',
          description: '3 идеи были закреплены',
          tierLabel: '3+ закреплений',
          color: '#E67E22',
        };
      case BadgeType.IDEA_GENERATOR:
        return {
          ...base,
          title: 'Генератор идей',
          description: 'Опубликовано 10 идей',
          tierLabel: '10+ идей',
          color: '#F1C40F',
        };
      case BadgeType.COMMUNITY_HEART:
        return {
          ...base,
          title: 'Сердце сообщества',
          description: 'Поставлено 10 лайков чужим идеям',
          tierLabel: '10+ лайков',
          color: '#E74C3C',
        };
      case BadgeType.KNOW_IT_ALL:
        return {
          ...base,
          title: 'Всезнайка',
          description: 'Оставил комментарии не менее чем в 5 разных темах',
          tierLabel: '5+ тем',
          color: '#9B59B6',
        };
      default:
        return {
          ...base,
          title: row.badgeType,
          description: '',
          tierLabel: '',
          color: '#95A5A6',
        };
    }
  }
}
