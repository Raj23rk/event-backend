import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Assessment, AssessmentSchema } from '../assessment/schemas/assessment.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import { QuestionsModule } from '../questions/questions.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
    QuestionsModule,
    StudentsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

