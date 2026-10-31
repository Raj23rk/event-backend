import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('start/:studentId')
  async startAssessment(@Param('studentId') studentId: string) {
    return this.assessmentService.startAssessment(studentId);
  }

  @Post('submit/:sessionId')
  async submitAssessment(
    @Param('sessionId') sessionId: string,
    @Body() submitDto: SubmitAssessmentDto,
  ) {
    return this.assessmentService.submitAssessment(sessionId, submitDto);
  }

  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.assessmentService.getSession(sessionId);
  }

  @Get('student/:studentId')
  async getStudentAssessment(@Param('studentId') studentId: string) {
    return this.assessmentService.getStudentAssessment(studentId);
  }
}

