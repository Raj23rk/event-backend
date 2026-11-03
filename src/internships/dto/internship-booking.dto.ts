import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInternshipBookingDto {
  @IsNotEmpty()
  @IsString()
  studentName: string;

  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsNotEmpty()
  @IsString()
  whatsapp: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  collegeName: string;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsNotEmpty()
  @IsString()
  year: string;

  @IsNotEmpty()
  @IsString()
  parentsMobile: string;

  @IsOptional()
  @IsString()
  internshipDomain?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmPaymentDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string; // e.g. 'UPI (GPay / PhonePe)', 'Credit/Debit Card', etc.

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class CreateRazorpayOrderDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;
}

export class VerifyRazorpayPaymentDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @IsNotEmpty()
  @IsString()
  razorpay_order_id: string;

  @IsNotEmpty()
  @IsString()
  razorpay_payment_id: string;

  @IsNotEmpty()
  @IsString()
  razorpay_signature: string;
}

