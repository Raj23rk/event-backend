import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

export class OptionItem {
  @Prop({ required: true })
  id: string; // 'A', 'B', 'C', 'D'

  @Prop({ required: true })
  text: string;
}

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true, trim: true })
  questionText: string;

  @Prop({ required: false, default: '' })
  codeSnippet: string;

  @Prop({ required: true, default: 'HTML' })
  category: 'HTML' | 'CSS' | 'Responsive Design' | 'Web Basics';

  @Prop({ required: true, default: 'Intermediate' })
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';

  @Prop({
    required: true,
    type: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
  })
  options: OptionItem[];

  @Prop({ required: true })
  correctAnswer: string; // 'A', 'B', 'C', 'D'

  @Prop({ required: true })
  explanation: string;

  @Prop({ required: true, default: false })
  isCustom: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true, default: true })
  active: boolean;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

