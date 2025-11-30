// entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ 
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ 
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING 
  })
  status: UserStatus;

  @Column({ nullable: true, type: 'varchar'})
  emailVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationCodeExpires: Date | null;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true, type: 'varchar' })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetTokenExpires: Date | null;

  @Column({ type: 'text', nullable: true })
  blockReason: string | null;

  @Column({ type: 'text', nullable: true })
  blockReasonForUser: string | null;

  @Column({ type: 'timestamp', nullable: true })
  blockedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}