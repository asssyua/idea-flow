import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from '../../entities/topic.entity';
import { TopicFavorite } from '../../entities/topic-favorite.entity';
import { User } from '../../entities/user.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { SuggestTopicDto } from './dto/suggest-topic.dto';
import { TopicStatus } from '../../enums/topic/topic-status.enum';
import { UserRole } from '../../enums/user/user-role.enum';
import { BadgeService } from '../badge/badge.service';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(TopicFavorite)
    private topicFavoriteRepository: Repository<TopicFavorite>,
    private readonly badgeService: BadgeService,
  ) {}

  private formatTopicResponse(topic: Topic, includeId: boolean = false): any {
    const response: any = {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      status: topic.status,
      privacy: topic.privacy,
      deadline: topic.deadline
        ? (topic.deadline instanceof Date ? topic.deadline.toISOString() : topic.deadline)
        : null,
      ideaCount: topic.ideaCount,
      createdAt: topic.createdAt
        ? (topic.createdAt instanceof Date ? topic.createdAt.toISOString() : topic.createdAt)
        : null,
      createdBy: topic.createdBy ? {
        firstName: topic.createdBy.firstName,
        lastName: topic.createdBy.lastName,
      } : null
    };

    return response;
  }

  async create(createTopicDto: CreateTopicDto, user: User): Promise<any> {
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для создания тем необходимо подтвердить email');
    }

    const topic = this.topicRepository.create({
      ...createTopicDto,
      createdBy: user,
      createdById: user.id,
      status: TopicStatus.APPROVED,
    });

    const savedTopic = await this.topicRepository.save(topic);
    if (savedTopic.status === TopicStatus.APPROVED) {
      await this.badgeService.evaluateAfterTopicApprovedOrCreated(user.id);
    }
    return this.formatTopicResponse(savedTopic);
  }

  async suggest(suggestTopicDto: SuggestTopicDto, user: User): Promise<any> {
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для предложения тем необходимо подтвердить email');
    }

    const topic = this.topicRepository.create({
      ...suggestTopicDto,
      createdBy: user,
      createdById: user.id,
      status: TopicStatus.PENDING,
    });

    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic);
  }

  async findAll(status?: TopicStatus): Promise<any[]> {
    const where = status ? { status } : {};
    const topics = await this.topicRepository.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return topics.map(topic => this.formatTopicResponse(topic, true));
  }

  async findForUser(user?: User): Promise<any[]> {
    let where: any = {};

   if (!user || user.role !== UserRole.ADMIN) {
      where = {
        status: TopicStatus.APPROVED,
        privacy: 'public'
      };
    }

    const topics = await this.topicRepository.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return topics.map(topic => this.formatTopicResponse(topic, user?.role === UserRole.ADMIN));
  }
  async findOne(id: string, user?: User): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    if (user && user.role === UserRole.USER) {
      if (topic.status !== TopicStatus.APPROVED || topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой теме');
      }
    }

    return this.formatTopicResponse(topic, user?.role === UserRole.ADMIN);
  }

  async listFavorites(user: User): Promise<any[]> {
    const favorites = await this.topicFavoriteRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    const topics = favorites
      .map(f => f.topic)
      .filter(Boolean);

    return topics.map(topic => this.formatTopicResponse(topic, true));
  }

  async isFavorite(topicId: string, user: User): Promise<{ isFavorite: boolean }> {
    const favorite = await this.topicFavoriteRepository.findOne({
      where: { userId: user.id, topicId },
    });
    return { isFavorite: !!favorite };
  }

  async addToFavorites(topicId: string, user: User): Promise<{ isFavorite: boolean }> {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    if (topic.status !== TopicStatus.APPROVED || topic.privacy !== 'public') {
      throw new ForbiddenException('У вас нет доступа к этой теме');
    }

    const existing = await this.topicFavoriteRepository.findOne({
      where: { userId: user.id, topicId },
    });

    if (existing) {
      return { isFavorite: true };
    }

    try {
      const fav = this.topicFavoriteRepository.create({
        userId: user.id,
        topicId,
      });
      await this.topicFavoriteRepository.save(fav);
    } catch (e) {
      throw new ConflictException('Тема уже добавлена в избранное');
    }

    return { isFavorite: true };
  }

  async removeFromFavorites(topicId: string, user: User): Promise<{ isFavorite: boolean }> {
    const existing = await this.topicFavoriteRepository.findOne({
      where: { userId: user.id, topicId },
    });

    if (existing) {
      await this.topicFavoriteRepository.remove(existing);
    }

    return { isFavorite: false };
  }

  async update(id: string, updateTopicDto: UpdateTopicDto, user: User): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    if (user.role !== UserRole.ADMIN) {
      if (topic.createdById !== user.id) {
        throw new ForbiddenException('Вы можете редактировать только свои темы');
      }
      if (topic.status !== TopicStatus.PENDING) {
        throw new ForbiddenException('Вы можете редактировать свои темы только во время их рассмотрения');
      }
    }

    Object.assign(topic, updateTopicDto);
    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic, user.role === UserRole.ADMIN);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    if (user.role !== UserRole.ADMIN) {
      if (topic.createdById !== user.id) {
        throw new ForbiddenException('Вы можете удалить только свои темы');
      }
      if (topic.status !== TopicStatus.PENDING) {
        throw new ForbiddenException('Вы можете удалить только свои темы находящиеся на расмотрении');
      }
    }

    await this.topicRepository.remove(topic);
    return { message: 'Тема удалена' };
  }

  async adminUpdate(id: string, updateTopicDto: UpdateTopicDto): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    Object.assign(topic, updateTopicDto);
    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic, true);
  }

  async approve(id: string): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }
    
    if (topic.status === TopicStatus.APPROVED) {
      throw new BadRequestException('Тема одобрена');
    }

    topic.status = TopicStatus.APPROVED;
    const savedTopic = await this.topicRepository.save(topic);
    await this.badgeService.evaluateAfterTopicApprovedOrCreated(topic.createdById);
    return this.formatTopicResponse(savedTopic, true);
  }

  async reject(id: string): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }
    
    if (topic.status === TopicStatus.REJECTED) {
      throw new BadRequestException('Тема отклонена');
    }

    topic.status = TopicStatus.REJECTED;
    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic, true);
  }

  async getPendingTopics(): Promise<any[]> {
    const topics = await this.topicRepository.find({
      where: { status: TopicStatus.PENDING },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return topics.map(topic => this.formatTopicResponse(topic, true));
  }
}