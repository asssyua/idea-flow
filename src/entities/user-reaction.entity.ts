import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Idea } from './idea.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike'
}

@Entity('user_reactions')
@Unique(['userId', 'ideaId']) 
export class UserReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ideaId' })
  idea: Idea;

  @Column()
  ideaId: string;

  @Column({ 
    type: 'enum', 
    enum: ReactionType 
  })
  type: ReactionType;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}