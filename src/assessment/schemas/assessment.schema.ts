import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssessmentDocument = Assessment & Document;

@Schema()
export class AssessmentQuestionItem {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  questionText: string;

  @Prop({ required: false, default: '' })
  codeSnippet: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  difficulty: string;

  @Prop({ required: true, type: [{ id: String, text: String }] })
  options: { id: string; text: string }[];

  @Prop({ required: false, default: null })
  selectedAnswer: string;

  @Prop({ required: true })
  correctAnswer: string;

  @Prop({ required: false, default: false })
  isCorrect: boolean;

  @Prop({ required: true })
  explanation: string;

  @Prop({ required: false, default: false })
  isCustom: boolean;

  @Prop({ required: false, default: 0 })
  timeSpentSeconds: number;
}

@Schema({ timestamps: true })
export class Assessment {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  registrationNumber: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true, default: 'HTML & CSS Web Development' })
  selectedDomain: string;

  @Prop({ required: true, type: [AssessmentQuestionItem] })
  questions: AssessmentQuestionItem[];

  @Prop({ required: true, default: 0 })
  totalQuestions: number;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, default: 0 })
  maxScore: number;

  @Prop({ required: true, default: 0 })
  percentage: number;

  @Prop({ type: Object, default: {} })
  categoryBreakdown: Record<string, { score: number; total: number; percentage: number }>;

  @Prop({ required: false, default: 'Foundational' })
  skillBand: string; // 'Foundational' | 'Developing' | 'Proficient' | 'Industry Ready'

  @Prop({ type: Object, default: {} })
  careerRecommendation: {
    roleTitle: string;
    description: string;
    suitableTracks: string[];
    strengths: string[];
    growthAreas: string[];
    actionPlan: string[];
  };

  @Prop({ required: true, default: 'in-progress' })
  status: 'in-progress' | 'submitted';

  @Prop({ required: true, default: Date.now })
  startedAt: Date;

  @Prop({ required: false, default: null })
  submittedAt: Date;

  @Prop({ required: false, default: 0 })
  timeTakenSeconds: number;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

