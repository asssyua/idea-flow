import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Idea } from '../../entities/idea.entity';
import { Comment } from '../../entities/comment.entity';
import { Topic } from '../../entities/topic.entity';
import { UserReaction } from '../../entities/user-reaction.entity';
import { User } from '../../entities/user.entity';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserRole } from '../../enums/user/user-role.enum';
import { TopicStatus } from '../../enums/topic/topic-status.enum';
import { ReactionType } from 'src/enums/reactions-type.enum';



@Injectable()
export class IdeaService {
  constructor(
    @InjectRepository(Idea)
    private ideaRepository: Repository<Idea>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(UserReaction) 
    private userReactionRepository: Repository<UserReaction>,
  ) {}

  private formatIdeaResponse(idea: Idea, includeId: boolean = false): any {
    const response: any = {
      id: idea.id, // Всегда включаем id, так как он нужен для реакций и комментариев
      title: idea.title,
      description: idea.description,
      images: idea.images || [],
      likes: idea.likes,
      dislikes: idea.dislikes,
      rating: idea.rating,
      commentCount: idea.commentCount,
      createdAt: idea.createdAt,
      author: {
        firstName: idea.author.firstName,
        lastName: idea.author.lastName,
      },
      topic: {
        title: idea.topic.title,
        status: idea.topic.status,
      }
    }

    if (includeId) {
      response['topicId'] = idea.topicId;
      response['authorId'] = idea.authorId;
    }

    return response;
  }

  private formatCommentResponse(comment: Comment): any {
    return {
      id: comment.id,
      content: comment.content,
      author: {
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
      },
      parentId: comment.parentId,
      createdAt: comment.createdAt,
    };
  }

  async create(createIdeaDto: CreateIdeaDto, user: User): Promise<any> {
    const topic = await this.topicRepository.findOne({
      where: { id: createIdeaDto.topicId }
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.status !== TopicStatus.APPROVED) {
      throw new BadRequestException('Cannot add ideas to unapproved topic');
    }

    if (topic.isExpired) {
      throw new BadRequestException('Topic deadline has expired');
    }

    const idea = this.ideaRepository.create({
      ...createIdeaDto,
      author: user,
      authorId: user.id,
      topic: topic,
    });

    const savedIdea = await this.ideaRepository.save(idea);
    
    await this.topicRepository.increment({ id: topic.id }, 'ideaCount', 1);

    return this.formatIdeaResponse(savedIdea);
  }

  async findByTopic(topicId: string, user?: User): Promise<any[]> {
    const topic = await this.topicRepository.findOne({ where: { id: topicId } });
    
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (topic.status !== TopicStatus.APPROVED || topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this topic');
      }
    }

    const ideas = await this.ideaRepository.find({
      where: { topicId },
      relations: ['author', 'topic'],
      order: { createdAt: 'DESC' },
    });

    return ideas.map(idea => this.formatIdeaResponse(idea, user?.role === UserRole.ADMIN));
  }

  async findAll(): Promise<any[]> {
    const ideas = await this.ideaRepository.find({
      relations: ['author', 'topic'],
      order: { createdAt: 'DESC' },
    });

    return ideas.map(idea => this.formatIdeaResponse(idea, true));
  }

  async findOne(id: string, user?: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this idea');
      }
    }

    return this.formatIdeaResponse(idea, user?.role === UserRole.ADMIN);
  }

  async update(id: string, updateIdeaDto: UpdateIdeaDto, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user.role !== UserRole.ADMIN && idea.authorId !== user.id) {
      throw new ForbiddenException('You can only update your own ideas');
    }

    Object.assign(idea, updateIdeaDto);
    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user.role !== UserRole.ADMIN && idea.authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own ideas');
    }

    await this.ideaRepository.remove(idea);
    
    await this.topicRepository.decrement({ id: idea.topicId }, 'ideaCount', 1);

    return { message: 'Idea deleted successfully' };
  }

  async adminRemove(id: string): Promise<{ message: string }> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    await this.ideaRepository.remove(idea);
    
    await this.topicRepository.decrement({ id: idea.topicId }, 'ideaCount', 1);

    return { message: 'Idea deleted by admin' };
  }

  async like(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this idea');
      }
    }

    const existingReaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    if (existingReaction) {
      if (existingReaction.type === ReactionType.LIKE) {
        await this.userReactionRepository.remove(existingReaction);
        idea.likes -= 1;
        const savedIdea = await this.ideaRepository.save(idea);
        return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
      } else {
        await this.userReactionRepository.remove(existingReaction);
        idea.dislikes -= 1;
      }
    }

    const reaction = this.userReactionRepository.create({
      userId: user.id,
      ideaId: id,
      type: ReactionType.LIKE,
    });
    await this.userReactionRepository.save(reaction);

    idea.likes += 1;
    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
  }

  async dislike(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this idea');
      }
    }

    const existingReaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    if (existingReaction) {
      if (existingReaction.type === ReactionType.DISLIKE) {
        await this.userReactionRepository.remove(existingReaction);
        idea.dislikes -= 1;
        const savedIdea = await this.ideaRepository.save(idea);
        return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
      } else {
        await this.userReactionRepository.remove(existingReaction);
        idea.likes -= 1;
      }
    }

    const reaction = this.userReactionRepository.create({
      userId: user.id,
      ideaId: id,
      type: ReactionType.DISLIKE,
    });
    await this.userReactionRepository.save(reaction);

    idea.dislikes += 1;
    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
  }
  async removeReaction(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const existingReaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    if (!existingReaction) {
      throw new BadRequestException('You have not reacted to this idea');
    }

    if (existingReaction.type === ReactionType.LIKE) {
      idea.likes -= 1;
    } else {
      idea.dislikes -= 1;
    }

    await this.userReactionRepository.remove(existingReaction);
    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN);
  }

  async getUserReaction(id: string, user: User): Promise<{ type: ReactionType | null }> {
    const reaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    return { type: reaction?.type || null };
  }

  async addComment(id: string, createCommentDto: CreateCommentDto, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this idea');
      }
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      idea: idea,
      ideaId: idea.id,
      author: user,
      authorId: user.id,
    });

    const savedComment = await this.commentRepository.save(comment);
    
    await this.ideaRepository.increment({ id: idea.id }, 'commentCount', 1);

    return this.formatCommentResponse(savedComment);
  }

  async getComments(id: string, user?: User): Promise<any[]> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('You do not have access to this idea');
      }
    }

    const comments = await this.commentRepository.find({
      where: { ideaId: id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    return comments.map(comment => this.formatCommentResponse(comment));
  }

  async removeComment(commentId: string, user: User): Promise<{ message: string }> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['idea', 'idea.topic'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (user.role !== UserRole.ADMIN && comment.authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
    
    await this.ideaRepository.decrement({ id: comment.ideaId }, 'commentCount', 1);

    return { message: 'Comment deleted successfully' };
  }

  async getAllComments(): Promise<any[]> {
    const comments = await this.commentRepository.find({
      relations: ['author', 'idea', 'idea.topic'],
      order: { createdAt: 'DESC' },
    });

    return comments.map(comment => ({
      ...this.formatCommentResponse(comment),
      idea: comment.idea ? {
        id: comment.idea.id,
        title: comment.idea.title,
        topic: comment.idea.topic ? {
          id: comment.idea.topic.id,
          title: comment.idea.topic.title,
          status: comment.idea.topic.status,
        } : null,
      } : null,
    }));
  }

  async adminRemoveComment(commentId: string): Promise<{ message: string }> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['idea'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.commentRepository.remove(comment);
    
    await this.ideaRepository.decrement({ id: comment.ideaId }, 'commentCount', 1);

    return { message: 'Comment deleted by admin' };
  }

  async getUserStatistics(userId: string): Promise<any> {
    const ideas = await this.ideaRepository.find({
      where: { authorId: userId },
      relations: ['topic'],
    });

    const totalIdeas = ideas.length;
    const totalLikes = ideas.reduce((sum, idea) => sum + idea.likes, 0);
    const totalDislikes = ideas.reduce((sum, idea) => sum + idea.dislikes, 0);
    const totalComments = ideas.reduce((sum, idea) => sum + idea.commentCount, 0);

    const ideasByTopic = ideas.reduce((acc, idea) => {
      const topicName = idea.topic.title;
      if (!acc[topicName]) {
        acc[topicName] = 0;
      }
      acc[topicName]++;
      return acc;
    }, {});

    return {
      totalIdeas,
      totalLikes,
      totalDislikes,
      totalComments,
      averageRating: totalLikes - totalDislikes,
      ideasByTopic,
    };
  }
}