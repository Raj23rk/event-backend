import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  studentName: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  age?: number | string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  parentOccupation?: string;

  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  parentMobile?: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  residentialAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsNotEmpty()
  @IsString()
  collegeName: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsNotEmpty()
  @IsString()
  courseYear: string;

  @IsOptional()
  @IsString()
  rollNumber?: string;

  @IsOptional()
  @IsString()
  boardUniversity?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  lastExamPercentage?: string;

  @IsOptional()
  @IsString()
  favouriteSubjects?: string;

  @IsOptional()
  @IsArray()
  careerInterests?: string[];

  @IsOptional()
  @IsString()
  dreamCareer?: string;

  @IsOptional()
  @IsString()
  workshopExpectation?: string;

  @IsOptional()
  @IsString()
  attendedBefore?: string;

  @IsOptional()
  @IsString()
  hearAbout?: string;

  @IsOptional()
  @IsString()
  selectedDomain?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  studentName?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  age?: number | string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  parentOccupation?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  parentMobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  residentialAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  collegeName?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  courseYear?: string;

  @IsOptional()
  @IsString()
  rollNumber?: string;

  @IsOptional()
  @IsString()
  boardUniversity?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  lastExamPercentage?: string;

  @IsOptional()
  @IsString()
  favouriteSubjects?: string;

  @IsOptional()
  @IsArray()
  careerInterests?: string[];

  @IsOptional()
  @IsString()
  dreamCareer?: string;

  @IsOptional()
  @IsString()
  workshopExpectation?: string;

  @IsOptional()
  @IsString()
  attendedBefore?: string;

  @IsOptional()
  @IsString()
  hearAbout?: string;

  @IsOptional()
  @IsString()
  selectedDomain?: string;

  @IsOptional()
  @IsString()
  status?: 'registered' | 'assessment_started' | 'completed';

  @IsOptional()
  assessmentScore?: number;

  @IsOptional()
  assessmentPercentage?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
