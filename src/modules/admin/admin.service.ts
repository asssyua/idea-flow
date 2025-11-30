import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserStatus } from '../../enums/user-status.enum';
import { BlockUserDto } from './dto/block-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const user = await this.getUserById(id);

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('User is already blocked');
    }

    user.status = UserStatus.BLOCKED;
    user.blockReason = dto.reason;
    user.blockReasonForUser = dto.reasonForUser || dto.reason; 
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

  // Добавьте этот метод в AdminService
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
    // Для админа показываем больше информации
    ...(user.status === UserStatus.BLOCKED && {
      blockInfo: {
        blockedAt: user.blockedAt,
        blockReason: user.blockReason, // Внутренняя причина
        blockReasonForUser: user.blockReasonForUser, // Причина для пользователя
      }
    })
  };
}


}