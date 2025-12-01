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
import { TopicService } from './topic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../../enums/user/user-role.enum';
import { User } from '../../entities/user.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { SuggestTopicDto } from './dto/suggest-topic.dto';
import { TopicStatus } from '../../enums/topic/topic-status.enum';

@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createTopicDto: CreateTopicDto, @GetUser() user: User) {
    return this.topicService.create(createTopicDto, user);
  }

  @Post('suggest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  suggest(@Body() suggestTopicDto: SuggestTopicDto, @GetUser() user: User) {
    return this.topicService.suggest(suggestTopicDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: TopicStatus) {
    return this.topicService.findAll(status);
  }

@Get('public')
  @UseGuards(JwtAuthGuard)
  findForUser(@GetUser() user: User) {
    return this.topicService.findForUser(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.topicService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto, @GetUser() user: User) {
    return this.topicService.update(id, updateTopicDto, user);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminUpdate(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicService.adminUpdate(id, updateTopicDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.topicService.remove(id, user);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.topicService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string) {
    return this.topicService.reject(id);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingTopics() {
    return this.topicService.getPendingTopics();
  }
}