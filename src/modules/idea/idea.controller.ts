import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { IdeaService } from './idea.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { User } from '../../entities/user.entity';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('ideas')
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  create(@Body() createIdeaDto: CreateIdeaDto, @GetUser() user: User) {
    return this.ideaService.create(createIdeaDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByTopic(@Query('topicId') topicId: string, @GetUser() user: User) {
    return this.ideaService.findByTopic(topicId, user);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.ideaService.findAll();
  }

  @Get('admin/comments/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllComments() {
    return this.ideaService.getAllComments();
  }

  @Delete('admin/comments/:commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminRemoveComment(@Param('commentId') commentId: string) {
    return this.ideaService.adminRemoveComment(commentId);
  }

  @Get('admin/statistics/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminUserStatistics(@Param('userId') userId: string) {
    return this.ideaService.getUserStatistics(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateIdeaDto: UpdateIdeaDto, @GetUser() user: User) {
    return this.ideaService.update(id, updateIdeaDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.remove(id, user);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminRemove(@Param('id') id: string) {
    return this.ideaService.adminRemove(id);
  }

 @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.like(id, user);
  }

  @Post(':id/dislike')
  @UseGuards(JwtAuthGuard)
  dislike(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.dislike(id, user);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(@Param('id') id: string, @Body() createCommentDto: CreateCommentDto, @GetUser() user: User) {
    return this.ideaService.addComment(id, createCommentDto, user);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  getComments(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.getComments(id, user);
  }

  @Get(':id/my-reaction')
  @UseGuards(JwtAuthGuard)
  getUserReaction(@Param('id') id: string, @GetUser() user: User) {
    return this.ideaService.getUserReaction(id, user);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  removeComment(@Param('commentId') commentId: string, @GetUser() user: User) {
    return this.ideaService.removeComment(commentId, user);
  }

  @Get('profile/statistics')
  @UseGuards(JwtAuthGuard)
  getUserStatistics(@GetUser() user: User) {
    return this.ideaService.getUserStatistics(user.id);
  }
}