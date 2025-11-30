import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { TopicStatus } from '../enums/topic/topic-status.enum';
import { TopicPrivacy } from '../enums/topic/topic-privacy.enum';

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ 
    type: 'enum', 
    enum: TopicStatus, 
    default: TopicStatus.PENDING 
  })
  status: TopicStatus;

  @Column({ 
    type: 'enum', 
    enum: TopicPrivacy, 
    default: TopicPrivacy.PUBLIC 
  })
  privacy: TopicPrivacy;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ default: 0 })
  ideaCount: number; 

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdBy' })
  createdBy: User;

  @Column()
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isExpired(): boolean {
    return this.deadline ? new Date() > this.deadline : false;
  }

  get canAddIdeas(): boolean {
    return this.status === TopicStatus.APPROVED && !this.isExpired;
  }
}