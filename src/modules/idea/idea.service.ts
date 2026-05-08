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
import { BadgeService } from '../badge/badge.service';

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
    private readonly badgeService: BadgeService,
  ) {}

  private formatIdeaResponse(idea: Idea, includeId: boolean = false, user?: User): any {
    const canEdit = !!user && (user.role === UserRole.ADMIN || idea.authorId === user.id);
    const canPin = !!user && (user.role === UserRole.ADMIN || idea.topic?.createdById === user.id);
    const response: any = {
      id: idea.id, // Всегда включаем id, так как он нужен для реакций и комментариев
      title: idea.title,
      images: idea.images || [],
      likes: idea.likes,
      dislikes: idea.dislikes,
      rating: idea.rating,
      commentCount: idea.commentCount,
      canEdit,
      canPin,
      isPinned: idea.isPinned,
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
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для добавления идей необходимо подтвердить email');
    }

    const topic = await this.topicRepository.findOne({
      where: { id: createIdeaDto.topicId }
    });

    if (!topic) {
      throw new NotFoundException('Тема для обсуждения не найдена');
    }

    if (topic.status !== TopicStatus.APPROVED) {
      throw new BadRequestException('Не удается добавить идеи в неутвержденную тему');
    }

    if (topic.isExpired) {
      throw new BadRequestException('Крайний срок подачи темы истек');
    }

    const idea = this.ideaRepository.create({
      ...createIdeaDto,
      author: user,
      authorId: user.id,
      topic: topic,
    });

    const savedIdea = await this.ideaRepository.save(idea);
    
    await this.topicRepository.increment({ id: topic.id }, 'ideaCount', 1);

    await this.badgeService.evaluateAfterIdeaCreated(user.id);

    return this.formatIdeaResponse(savedIdea, false, user);
  }

  async findByTopic(topicId: string, user?: User): Promise<any[]> {
    const topic = await this.topicRepository.findOne({ where: { id: topicId } });
    
    if (!topic) {
      throw new NotFoundException('Тема не найдена');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (topic.status !== TopicStatus.APPROVED || topic.privacy !== 'public') {
        throw new ForbiddenException('Y вас нет доступа к этой теме');
      }
    }

    const ideas = await this.ideaRepository.find({
      where: { topicId },
      relations: ['author', 'topic'],
      order: { isPinned: 'DESC', pinnedAt: 'DESC', createdAt: 'DESC' },
    });

    return ideas.map(idea => this.formatIdeaResponse(idea, user?.role === UserRole.ADMIN, user));
  }

  async pinIdea(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN && idea.topic.createdById !== user.id) {
      throw new ForbiddenException('Вы можете закреплять идеи только в своих темах');
    }

    if (idea.isPinned) {
      return this.formatIdeaResponse(idea, user.role === UserRole.ADMIN, user);
    }

    const pinnedCount = await this.ideaRepository.count({
      where: { topicId: idea.topicId, isPinned: true },
    });

    if (pinnedCount >= 3) {
      throw new ConflictException('Достигнут лимит закрепленных идей (3) для этой темы');
    }

    idea.isPinned = true;
    idea.pinnedAt = new Date();
    const savedIdea = await this.ideaRepository.save(idea);
    
    await this.badgeService.evaluateAfterIdeaPinned(idea.authorId);
    
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
  }

  async unpinIdea(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN && idea.topic.createdById !== user.id) {
      throw new ForbiddenException('Вы можете откреплять идеи только в своих темах');
    }

    if (!idea.isPinned) {
      return this.formatIdeaResponse(idea, user.role === UserRole.ADMIN, user);
    }

    idea.isPinned = false;
    idea.pinnedAt = null;
    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
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
      throw new NotFoundException('Идея не найдена');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой идеи');
      }
    }

    return this.formatIdeaResponse(idea, user?.role === UserRole.ADMIN, user);
  }

  async update(id: string, updateIdeaDto: UpdateIdeaDto, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN && idea.authorId !== user.id) {
      throw new ForbiddenException('Вы можете обновлять только свои собственные идеи');
    }

    if (typeof updateIdeaDto.title !== 'undefined') {
      idea.title = updateIdeaDto.title;
    }
 
    if (typeof updateIdeaDto.images !== 'undefined') {
      idea.images = updateIdeaDto.images;
    }

    const savedIdea = await this.ideaRepository.save(idea);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN && idea.authorId !== user.id) {
      throw new ForbiddenException('Вы можете удалять только свои идеи');
    }

    await this.ideaRepository.remove(idea);
    
    await this.topicRepository.decrement({ id: idea.topicId }, 'ideaCount', 1);

    return { message: 'Идея удаоена' };
  }

  async adminRemove(id: string): Promise<{ message: string }> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    await this.ideaRepository.remove(idea);
    
    await this.topicRepository.decrement({ id: idea.topicId }, 'ideaCount', 1);

    return { message: 'Идея удалена администратором' };
  }

  async like(id: string, user: User): Promise<any> {
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для оценки идей необходимо подтвердить email');
    }

    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой идеи');
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
        await this.badgeService.evaluateAfterAuthorIdeaMetricsChanged(idea.authorId);
        return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
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
    await this.badgeService.evaluateAfterAuthorIdeaMetricsChanged(idea.authorId);
    await this.badgeService.evaluateAfterLikeGiven(user.id);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
  }

  async dislike(id: string, user: User): Promise<any> {
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для оценки идей необходимо подтвердить email');
    }

    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой идеи');
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
        await this.badgeService.evaluateAfterAuthorIdeaMetricsChanged(idea.authorId);
        return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
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
    await this.badgeService.evaluateAfterAuthorIdeaMetricsChanged(idea.authorId);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
  }
  async removeReaction(id: string, user: User): Promise<any> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author', 'topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    const existingReaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    if (!existingReaction) {
      throw new BadRequestException('Вы никак не отреагировали на эту идею');
    }

    if (existingReaction.type === ReactionType.LIKE) {
      idea.likes -= 1;
    } else {
      idea.dislikes -= 1;
    }

    await this.userReactionRepository.remove(existingReaction);
    const savedIdea = await this.ideaRepository.save(idea);
    await this.badgeService.evaluateAfterAuthorIdeaMetricsChanged(idea.authorId);
    return this.formatIdeaResponse(savedIdea, user.role === UserRole.ADMIN, user);
  }

  async getUserReaction(id: string, user: User): Promise<{ type: ReactionType | null }> {
    const reaction = await this.userReactionRepository.findOne({
      where: { userId: user.id, ideaId: id }
    });

    return { type: reaction?.type || null };
  }

  async addComment(id: string, createCommentDto: CreateCommentDto, user: User): Promise<any> {
    if (!user.isEmailVerified) {
      throw new BadRequestException('Для добавления комментариев необходимо подтвердить email');
    }

    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('IИдея не найдена');
    }

    if (user.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой иеди');
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

    await this.badgeService.evaluateAfterCommentAdded(user.id);

    return this.formatCommentResponse(savedComment);
  }

  async getComments(id: string, user?: User): Promise<any[]> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['topic'],
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    if (user?.role !== UserRole.ADMIN) {
      if (idea.topic.status !== TopicStatus.APPROVED || idea.topic.privacy !== 'public') {
        throw new ForbiddenException('У вас нет доступа к этой идеи');
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
      throw new NotFoundException('Комментарий не найден');
    }

    if (user.role !== UserRole.ADMIN && comment.authorId !== user.id) {
      throw new ForbiddenException('Вы можете удалить только свои комментарии');
    }

    await this.commentRepository.remove(comment);
    
    await this.ideaRepository.decrement({ id: comment.ideaId }, 'commentCount', 1);

    return { message: 'Комментарий удалён успешно' };
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
      throw new NotFoundException('Комменатрий не найден');
    }

    await this.commentRepository.remove(comment);
    
    await this.ideaRepository.decrement({ id: comment.ideaId }, 'commentCount', 1);

    return { message: 'Комментарий удалён админом' };
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