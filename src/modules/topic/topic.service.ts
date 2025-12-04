import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from '../../entities/topic.entity';
import { User } from '../../entities/user.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { SuggestTopicDto } from './dto/suggest-topic.dto';
import { TopicStatus } from '../../enums/topic/topic-status.enum';
import { UserRole } from '../../enums/user/user-role.enum';
import { TopicPrivacy } from 'src/enums/topic/topic-privacy.enum';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
  ) {}

  private formatTopicResponse(topic: Topic, includeId: boolean = false): any {
    const response: any = {
      id: topic.id, // Всегда включаем id
      title: topic.title,
      description: topic.description,
      status: topic.status,
      privacy: topic.privacy,
      deadline: topic.deadline ? topic.deadline.toISOString() : null,
      ideaCount: topic.ideaCount,
      createdAt: topic.createdAt ? topic.createdAt.toISOString() : null,
      createdBy: topic.createdBy ? {
        firstName: topic.createdBy.firstName,
        lastName: topic.createdBy.lastName,
      } : null
    };

    return response;
  }

  async create(createTopicDto: CreateTopicDto, user: User): Promise<any> {
    const topic = this.topicRepository.create({
      ...createTopicDto,
      createdBy: user,
      createdById: user.id,
      status: TopicStatus.APPROVED,
    });

    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic);
  }

  async suggest(suggestTopicDto: SuggestTopicDto, user: User): Promise<any> {
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
      throw new NotFoundException('Topic not found');
    }

    if (user && user.role === UserRole.USER) {
      if (topic.status !== TopicStatus.APPROVED || topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this topic');
      }
    }

    return this.formatTopicResponse(topic, user?.role === UserRole.ADMIN);
  }

  async update(id: string, updateTopicDto: UpdateTopicDto, user: User): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (user.role !== UserRole.ADMIN) {
      if (topic.createdById !== user.id) {
        throw new ForbiddenException('You can only update your own topics');
      }
      if (topic.status !== TopicStatus.PENDING) {
        throw new ForbiddenException('You can only edit your topics while they are pending');
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
      throw new NotFoundException('Topic not found');
    }

    if (user.role !== UserRole.ADMIN) {
      if (topic.createdById !== user.id) {
        throw new ForbiddenException('You can only delete your own topics');
      }
      if (topic.status !== TopicStatus.PENDING) {
        throw new ForbiddenException('You can only delete your topics while they are pending');
      }
    }

    await this.topicRepository.remove(topic);
    return { message: 'Topic deleted successfully' };
  }

  async adminUpdate(id: string, updateTopicDto: UpdateTopicDto): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
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
      throw new NotFoundException('Topic not found');
    }
    
    if (topic.status === TopicStatus.APPROVED) {
      throw new BadRequestException('Topic is already approved');
    }

    topic.status = TopicStatus.APPROVED;
    const savedTopic = await this.topicRepository.save(topic);
    return this.formatTopicResponse(savedTopic, true);
  }

  async reject(id: string): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
    
    if (topic.status === TopicStatus.REJECTED) {
      throw new BadRequestException('Topic is already rejected');
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