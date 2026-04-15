import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Topic } from './topic.entity';

@Entity('topic_favorites')
@Unique(['userId', 'topicId'])
export class TopicFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Topic, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

  @Column()
  topicId: string;

  @CreateDateColumn()
  createdAt: Date;
}
