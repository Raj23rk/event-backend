import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InternshipBookingDocument = InternshipBooking & Document;

@Schema({ timestamps: true })
export class InternshipBooking {
  @Prop({ required: true, unique: true, index: true })
  bookingId: string; // e.g. WG-INT-2026-001

  @Prop({ required: true, trim: true })
  studentName: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ required: true, trim: true })
  whatsapp: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true })
  collegeName: string;

  @Prop({ required: true, trim: true })
  department: string;

  @Prop({ required: true, trim: true })
  year: string; // '1st Year' | '2nd Year' | '3rd Year' | 'Final Year' | 'Passed Out'

  @Prop({ required: true, trim: true })
  parentsMobile: string;

  @Prop({ required: true, default: 'Fullstack Web Development (React & NestJS)' })
  internshipDomain: string;

  @Prop({ required: true, default: 'In-Campus (Sivakasi)' })
  mode: string;

  @Prop({ required: true, default: 1000 })
  prebookingAmount: number; // ₹1000

  @Prop({ required: true, default: 'pending', enum: ['pending', 'paid', 'failed'] })
  paymentStatus: 'pending' | 'paid' | 'failed';

  @Prop({ required: false, default: '' })
  paymentMethod: string; // 'UPI' | 'GPay' | 'PhonePe' | 'Card' | 'NetBanking'

  @Prop({ required: false, default: '' })
  transactionId: string;

  @Prop({ required: false, default: '' })
  razorpayOrderId?: string;

  @Prop({ required: false, default: '' })
  razorpayPaymentId?: string;

  @Prop({ required: false, default: '' })
  razorpaySignature?: string;

  @Prop({ required: false })
  paidAt: Date;

  @Prop({ required: false, default: false })
  receiptSent: boolean;

  @Prop({ required: false, default: 'pending' })
  emailDeliveryStatus: string; // 'sent' | 'simulated' | 'failed'

  @Prop({ required: false, default: '' })
  receiptHtml: string;

  @Prop({ required: true, default: '9344337331' })
  enquiryPhone: string;

  @Prop({ required: false, default: '' })
  notes: string;
}

export const InternshipBookingSchema = SchemaFactory.createForClass(InternshipBooking);

