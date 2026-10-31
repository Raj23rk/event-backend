import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AnswerItemDto {
  @IsNotEmpty()
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedAnswer: string;

  @IsOptional()
  @IsNumber()
  timeSpentSeconds?: number;
}

export class SubmitAssessmentDto {
  @IsArray()
  answers: AnswerItemDto[];

  @IsOptional()
  @IsNumber()
  totalTimeSeconds?: number;
}

