import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from './schemas/assessment.schema';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { StudentsModule } from '../students/students.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Assessment.name, schema: AssessmentSchema }]),
    StudentsModule,
    QuestionsModule,
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService, MongooseModule],
})
export class AssessmentModule {}

