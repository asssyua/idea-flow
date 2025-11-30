import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Injectable()
export class AdminSeed {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seed() {
    const adminEmail = 'admin@ideaflow.com';
    
    const existingAdmin = await this.userRepository.findOne({ 
      where: { email: adminEmail } 
    });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
      
      const adminUser = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });
      
      await this.userRepository.save(adminUser);
      console.log(' Admin user seeded');
    }
  }
}