import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudentDocument = Student & Document;

@Schema({ timestamps: true })
export class Student {
  @Prop({ required: true, trim: true })
  studentName: string;

  @Prop({ required: false })
  dob: string;

  @Prop({ required: false })
  age: number;

  @Prop({ required: false, default: 'Male' })
  gender: string;

  @Prop({ required: false })
  parentName: string;

  @Prop({ required: false })
  parentOccupation: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ required: false, trim: true })
  whatsapp: string;

  @Prop({ required: false, trim: true })
  parentMobile: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ required: false })
  residentialAddress: string;

  @Prop({ required: false, default: 'Sivakasi' })
  city: string;

  @Prop({ required: false })
  pincode: string;

  // Education Details
  @Prop({ required: true })
  collegeName: string;

  @Prop({ required: false })
  department: string;

  @Prop({ required: true })
  courseYear: string;

  @Prop({ required: false })
  rollNumber: string;

  @Prop({ required: false })
  boardUniversity: string;

  @Prop({ required: false, default: 'English' })
  medium: string;

  @Prop({ required: false })
  lastExamPercentage: string;

  @Prop({ required: false })
  favouriteSubjects: string;

  // Career Interests
  @Prop({ type: [String], default: [] })
  careerInterests: string[];

  @Prop({ required: false })
  dreamCareer: string;

  @Prop({ required: false })
  workshopExpectation: string;

  // Additional details
  @Prop({ required: false, default: 'No' })
  attendedBefore: string;

  @Prop({ required: false, default: 'Social Media' })
  hearAbout: string;

  // Domain selection for test
  @Prop({ required: true, default: 'HTML & CSS Web Development' })
  selectedDomain: string;

  // Unique Registration Number (e.g. WG-2026-001)
  @Prop({ required: true, unique: true, index: true })
  registrationNumber: string;

  @Prop({ required: false })
  studentId: string;

  @Prop({ required: true, default: 'registered' })
  status: 'registered' | 'assessment_started' | 'completed';

  @Prop({ required: false, default: null })
  assessmentSessionId: string;

  @Prop({ required: false, default: 0 })
  assessmentScore: number;

  @Prop({ required: false, default: 0 })
  assessmentPercentage: number;

  @Prop({ required: false })
  adminNotes: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
