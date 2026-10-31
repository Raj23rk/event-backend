import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  async create(@Body() createDto: CreateQuestionDto) {
    return this.questionsService.create(createDto);
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('isCustom') isCustom?: string,
  ) {
    const filter: any = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (isCustom !== undefined) filter.isCustom = isCustom === 'true';
    return this.questionsService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<CreateQuestionDto>) {
    return this.questionsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return { success: await this.questionsService.delete(id) };
  }

  @Post('seed')
  async seed() {
    return this.questionsService.seedDefaultQuestions();
  }
}

