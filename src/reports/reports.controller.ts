import { Controller, Get, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('workshop-overview')
  async getWorkshopOverview() {
    return this.reportsService.getWorkshopOverview();
  }

  @Get('question-wise')
  async getQuestionWiseAnalysis() {
    return this.reportsService.getQuestionWiseAnalysis();
  }

  @Get('student-roster')
  async getStudentRosterAndRankings() {
    return this.reportsService.getStudentRosterAndRankings();
  }

  @Post('seed-demo')
  async seedDemo() {
    return this.reportsService.seedDemoStudents();
  }
}

