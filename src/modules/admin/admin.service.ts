import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { SupportMessage } from '../../entities/support-message.entity';
import { Topic } from '../../entities/topic.entity';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { UserStatus } from '../../enums/user/user-status.enum';
import { BlockUserDto } from './dto/block-user.dto';

interface UserStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  count: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SupportMessage)
    private readonly supportMessageRepository: Repository<SupportMessage>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

async getAllUsers(): Promise<any[]> {
  const users = await this.userRepository.find();
  return users.map(user => this.formatUserResponse(user));
}

async getUserById(id: string): Promise<any> {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException('User not found');
  return this.formatUserResponse(user);
}

  async blockUser(id: string, dto: BlockUserDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new BadRequestException('Cannot block an administrator');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('User is already blocked');
    }

    user.status = UserStatus.BLOCKED;
    user.blockReason = dto.reason;
    user.blockReasonForUser = dto.reason; // Используем одно поле для обеих причин
    user.blockedAt = new Date();

    await this.userRepository.save(user);

    return { message: 'User successfully blocked' };
  }

  async unblockUser(id: string): Promise<{ message: string }> {
    const user = await this.getUserById(id);

    if (user.status !== UserStatus.BLOCKED) {
      throw new BadRequestException('User is not blocked');
    }

    user.status = UserStatus.ACTIVE;
    user.blockReason = null;
    user.blockReasonForUser = null;
    user.blockedAt = null;

    await this.userRepository.save(user);

    return { message: 'User successfully unblocked' };
  }

  async sendSupportMessage(email: string, message: string, blockReason?: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.status !== UserStatus.BLOCKED) {
      throw new BadRequestException('Только заблокированные пользователи могут отправлять сообщения в службу поддержки');
    }

    const supportMessage = this.supportMessageRepository.create({
      userId: user.id,
      message,
      blockReason: blockReason || user.blockReason,
    });

    await this.supportMessageRepository.save(supportMessage);

    return { message: 'Сообщение службы поддержки успешно отправлено' };
  }

  async getAllSupportMessages(): Promise<any[]> {
    const messages = await this.supportMessageRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return messages.map(msg => ({
      id: msg.id,
      userEmail: msg.user.email,
      userName: `${msg.user.firstName} ${msg.user.lastName}`,
      message: msg.message,
      blockReason: msg.blockReason,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
    }));
  }

  async markSupportMessageAsRead(id: string): Promise<{ message: string }> {
    const supportMessage = await this.supportMessageRepository.findOne({ where: { id } });
    
    if (!supportMessage) {
      throw new NotFoundException('Сообщение службы поддержки не найдено');
    }

    supportMessage.isRead = true;
    await this.supportMessageRepository.save(supportMessage);

    return { message: 'Сообщение службы поддержки помечено как прочитанное' };
  }

private formatUserResponse(user: User): any {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.status === UserStatus.BLOCKED && {
      blockInfo: {
        blockedAt: user.blockedAt,
        blockReason: user.blockReason,
      }
    })
  };
}

async getStatistics(): Promise<{
  topTopicsCreators: UserStats[];
  topIdeasAuthors: UserStats[];
  topCommentsAuthors: UserStats[];
  topLikesReceivers: UserStats[];
}> {
  // Топ по созданным темам
  const topics = await this.topicRepository.find({ relations: ['createdBy'] });
  const topicsCountMap = new Map<string, UserStats>();
  
  for (const topic of topics) {
    if (!topic.createdBy) continue;
    const userId = topic.createdBy.id;
    const existing = topicsCountMap.get(userId);
    if (existing) {
      existing.count++;
    } else {
      topicsCountMap.set(userId, {
        id: userId,
        firstName: topic.createdBy.firstName,
        lastName: topic.createdBy.lastName,
        email: topic.createdBy.email,
        count: 1,
      });
    }
  }
  
  const topTopicsCreators = Array.from(topicsCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Топ по опубликованным идеям
  const ideas = await this.ideaRepository.find({ relations: ['author'] });
  const ideasCountMap = new Map<string, UserStats>();
  
  for (const idea of ideas) {
    if (!idea.author) continue;
    const userId = idea.author.id;
    const existing = ideasCountMap.get(userId);
    if (existing) {
      existing.count++;
    } else {
      ideasCountMap.set(userId, {
        id: userId,
        firstName: idea.author.firstName,
        lastName: idea.author.lastName,
        email: idea.author.email,
        count: 1,
      });
    }
  }
  
  const topIdeasAuthors = Array.from(ideasCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Топ по комментариям
  const comments = await this.commentRepository.find({ relations: ['author'] });
  const commentsCountMap = new Map<string, UserStats>();
  
  for (const comment of comments) {
    if (!comment.author) continue;
    const userId = comment.author.id;
    const existing = commentsCountMap.get(userId);
    if (existing) {
      existing.count++;
    } else {
      commentsCountMap.set(userId, {
        id: userId,
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
        email: comment.author.email,
        count: 1,
      });
    }
  }
  
  const topCommentsAuthors = Array.from(commentsCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Топ по полученным лайкам (сумма лайков на идеях автора)
  const likesCountMap = new Map<string, UserStats>();
  
  for (const idea of ideas) {
    if (!idea.author) continue;
    const userId = idea.author.id;
    const existing = likesCountMap.get(userId);
    if (existing) {
      existing.count += idea.likes || 0;
    } else {
      likesCountMap.set(userId, {
        id: userId,
        firstName: idea.author.firstName,
        lastName: idea.author.lastName,
        email: idea.author.email,
        count: idea.likes || 0,
      });
    }
  }
  
  const topLikesReceivers = Array.from(likesCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    topTopicsCreators,
    topIdeasAuthors,
    topCommentsAuthors,
    topLikesReceivers,
  };
}

}