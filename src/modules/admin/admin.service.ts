import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { SupportMessage } from '../../entities/support-message.entity';
import { UserStatus } from '../../enums/user/user-status.enum';
import { BlockUserDto } from './dto/block-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SupportMessage)
    private readonly supportMessageRepository: Repository<SupportMessage>,
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
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.BLOCKED) {
      throw new BadRequestException('Only blocked users can send support messages');
    }

    const supportMessage = this.supportMessageRepository.create({
      userId: user.id,
      message,
      blockReason: blockReason || user.blockReason,
    });

    await this.supportMessageRepository.save(supportMessage);

    return { message: 'Support message sent successfully' };
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
      throw new NotFoundException('Support message not found');
    }

    supportMessage.isRead = true;
    await this.supportMessageRepository.save(supportMessage);

    return { message: 'Support message marked as read' };
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


}