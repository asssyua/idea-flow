import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_badges')
@Unique(['userId', 'badgeType'])
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 64 })
  badgeType: string;

  @Column({ type: 'smallint' })
  level: number;

  @CreateDateColumn()
  firstEarnedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
