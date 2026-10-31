import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @IsOptional()
  @IsString()
  codeSnippet?: string;

  @IsNotEmpty()
  @IsString()
  category: 'HTML' | 'CSS' | 'Responsive Design' | 'Web Basics';

  @IsNotEmpty()
  @IsString()
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';

  @IsArray()
  options: { id: string; text: string }[];

  @IsNotEmpty()
  @IsString()
  correctAnswer: string;

  @IsNotEmpty()
  @IsString()
  explanation: string;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

