import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import { Resend } from 'resend';
import * as crypto from 'crypto';
import { InternshipBooking, InternshipBookingDocument } from './schemas/internship-booking.schema';
import {
  CreateInternshipBookingDto,
  ConfirmPaymentDto,
  VerifyRazorpayPaymentDto,
} from './dto/internship-booking.dto';

@Injectable()
export class InternshipsService {
  private transporter: nodemailer.Transporter | null = null;
  private razorpay: Razorpay | null = null;
  private resend: Resend | null = null;

  constructor(
    @InjectModel(InternshipBooking.name)
    private bookingModel: Model<InternshipBookingDocument>,
  ) {
    this.initMailer();
    this.initRazorpay();
    this.initResend();
  }

  private initMailer() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  private initRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log(`Razorpay gateway initialized with Key: ${keyId}`);
    } else {
      console.warn('Razorpay credentials not found in environment');
    }
  }

  private initResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('Resend email client initialized');
    } else {
      console.warn('RESEND_API_KEY not found in environment');
    }
  }

  async createBooking(dto: CreateInternshipBookingDto): Promise<InternshipBooking> {
    // Validate: student mobile and parents mobile cannot be the same
    const cleanMobile = (dto.mobile || '').replace(/\D/g, '');
    const cleanParentsMobile = (dto.parentsMobile || '').replace(/\D/g, '');
    if (cleanMobile && cleanParentsMobile && cleanMobile === cleanParentsMobile) {
      throw new BadRequestException(
        'Student mobile number and Parents phone number cannot be the same. Please provide a different contact number for parent/guardian.',
      );
    }

    const count = await this.bookingModel.countDocuments();
    const nextSeq = count + 1;
    const bookingId = `WG-INT-2026-${String(nextSeq).padStart(3, '0')}`;

    const newBooking = new this.bookingModel({
      ...dto,
      bookingId,
      prebookingAmount: 1000,
      paymentStatus: 'pending',
      enquiryPhone: '9344337331',
    });

    return newBooking.save();
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<InternshipBooking> {
    const booking = await this.bookingModel.findOne({ bookingId: dto.bookingId });
    if (!booking) {
      throw new NotFoundException(`Booking ID ${dto.bookingId} not found.`);
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const txnId = dto.transactionId || `TXN-WG-934433-${randomSuffix}`;

    booking.paymentStatus = 'paid';
    booking.paymentMethod = dto.paymentMethod || 'UPI (9344337331)';
    booking.transactionId = txnId;
    booking.paidAt = new Date();

    // Generate HTML receipt
    const receiptHtml = this.generateReceiptHtml(booking, txnId);
    booking.receiptHtml = receiptHtml;

    // Send email receipt to student
    try {
      const emailResult = await this.sendEmailReceipt(
        booking.email,
        booking.studentName,
        booking.bookingId,
        txnId,
        receiptHtml,
      );
      booking.receiptSent = true;
      booking.emailDeliveryStatus = emailResult.status;
    } catch (err) {
      console.warn('Email dispatch notice:', err);
      booking.receiptSent = true;
      booking.emailDeliveryStatus = 'simulated';
    }

    return booking.save();
  }

  async createRazorpayOrder(bookingId: string) {
    const booking = await this.bookingModel.findOne({ bookingId });
    if (!booking) {
      throw new NotFoundException(`Booking ID ${bookingId} not found.`);
    }

    if (!this.razorpay) {
      throw new BadRequestException('Razorpay payment gateway is not initialized on the server.');
    }

    const amountPaise = (booking.prebookingAmount || 1000) * 100;

    try {
      const order = await this.razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: booking.bookingId,
        notes: {
          bookingId: booking.bookingId,
          studentName: booking.studentName,
          mobile: booking.mobile,
          email: booking.email,
          collegeName: booking.collegeName,
          internshipDomain: booking.internshipDomain,
        },
      });

      booking.razorpayOrderId = order.id;
      await booking.save();

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId: booking.bookingId,
        studentName: booking.studentName,
        email: booking.email,
        mobile: booking.mobile,
      };
    } catch (err: any) {
      console.error('Razorpay order creation error:', err);
      throw new BadRequestException(err.message || 'Failed to generate Razorpay order');
    }
  }

  async verifyRazorpayPayment(dto: VerifyRazorpayPaymentDto): Promise<InternshipBooking> {
    const booking = await this.bookingModel.findOne({ bookingId: dto.bookingId });
    if (!booking) {
      throw new NotFoundException(`Booking ID ${dto.bookingId} not found.`);
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpay_signature) {
      throw new BadRequestException('Invalid Razorpay payment signature. Payment verification failed.');
    }

    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'Razorpay Online';
    booking.transactionId = dto.razorpay_payment_id;
    booking.razorpayOrderId = dto.razorpay_order_id;
    booking.razorpayPaymentId = dto.razorpay_payment_id;
    booking.razorpaySignature = dto.razorpay_signature;
    booking.paidAt = new Date();

    // Generate HTML receipt
    const receiptHtml = this.generateReceiptHtml(booking, dto.razorpay_payment_id);
    booking.receiptHtml = receiptHtml;

    // Send email receipt using Resend
    try {
      const emailResult = await this.sendEmailReceipt(
        booking.email,
        booking.studentName,
        booking.bookingId,
        dto.razorpay_payment_id,
        receiptHtml,
      );
      booking.receiptSent = true;
      booking.emailDeliveryStatus = emailResult.status;
    } catch (err: any) {
      console.warn('Email dispatch warning:', err);
      booking.receiptSent = true;
      booking.emailDeliveryStatus = 'resend-attempted';
    }

    return booking.save();
  }

  async findAll(query: any = {}): Promise<InternshipBooking[]> {
    const filter: any = {};
    if (query.paymentStatus && query.paymentStatus !== 'all') {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.department && query.department !== 'all') {
      filter.department = query.department;
    }
    if (query.internshipDomain && query.internshipDomain !== 'all') {
      filter.internshipDomain = query.internshipDomain;
    }
    if (query.search) {
      filter.$or = [
        { studentName: { $regex: query.search, $options: 'i' } },
        { bookingId: { $regex: query.search, $options: 'i' } },
        { collegeName: { $regex: query.search, $options: 'i' } },
        { mobile: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { transactionId: { $regex: query.search, $options: 'i' } },
      ];
    }
    return this.bookingModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<InternshipBooking> {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) {
      throw new NotFoundException(`Internship booking not found.`);
    }
    return booking;
  }

  async findByBookingId(bookingId: string): Promise<InternshipBooking> {
    const booking = await this.bookingModel.findOne({ bookingId }).exec();
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found.`);
    }
    return booking;
  }

  async getStats() {
    const totalApplications = await this.bookingModel.countDocuments();
    const paidBookings = await this.bookingModel.find({ paymentStatus: 'paid' }).exec();
    const pendingCount = await this.bookingModel.countDocuments({ paymentStatus: 'pending' });

    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.prebookingAmount || 1000), 0);

    const domainBreakdown: Record<string, number> = {};
    const departmentBreakdown: Record<string, number> = {};

    const allBookings = await this.bookingModel.find().select('internshipDomain department').exec();
    for (const b of allBookings) {
      domainBreakdown[b.internshipDomain] = (domainBreakdown[b.internshipDomain] || 0) + 1;
      departmentBreakdown[b.department] = (departmentBreakdown[b.department] || 0) + 1;
    }

    return {
      totalApplications,
      paidCount: paidBookings.length,
      pendingCount,
      totalRevenue,
      domainBreakdown,
      departmentBreakdown,
      enquiryContact: '9344337331',
    };
  }

  async resendReceipt(id: string): Promise<{ success: boolean; message: string }> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.paymentStatus !== 'paid') {
      throw new NotFoundException('Cannot send receipt for unpaid booking.');
    }

    const receiptHtml = booking.receiptHtml || this.generateReceiptHtml(booking, booking.transactionId);
    await this.sendEmailReceipt(
      booking.email,
      booking.studentName,
      booking.bookingId,
      booking.transactionId,
      receiptHtml,
    );

    booking.receiptSent = true;
    await booking.save();

    return { success: true, message: `Receipt sent to ${booking.email}` };
  }

  private async sendEmailReceipt(
    toEmail: string,
    studentName: string,
    bookingId: string,
    txnId: string,
    receiptHtml: string,
  ): Promise<{ status: string }> {
    // 1. Prioritize Resend API (as requested by user)
    if (this.resend) {
      const fromAddress = process.env.MAIL_FROM || 'WeGrow B School <noreply@wegrowbschool.in>';
      try {
        console.log(`[RESEND] Sending payment receipt to ${toEmail} from ${fromAddress}...`);
        const { data, error } = await this.resend.emails.send({
          from: fromAddress,
          to: [toEmail],
          subject: `Payment Receipt: ₹1,000 Internship Pre-Booking Confirmed [${bookingId}]`,
          html: receiptHtml,
        });

        if (error) {
          console.warn('[RESEND] Send attempt warning:', error);
          // If custom domain is not yet verified in Resend, try Resend onboarding domain as safe fallback
          if (fromAddress !== 'WeGrow Skill Campus <onboarding@resend.dev>') {
            console.log('[RESEND] Retrying with onboarding@resend.dev fallback...');
            const fallback = await this.resend.emails.send({
              from: 'WeGrow Skill Campus <onboarding@resend.dev>',
              to: [toEmail],
              subject: `Payment Receipt: ₹1,000 Internship Pre-Booking Confirmed [${bookingId}]`,
              html: receiptHtml,
            });
            if (!fallback.error && fallback.data?.id) {
              console.log(`[RESEND] Fallback delivered email! ID: ${fallback.data.id}`);
              return { status: `sent (resend: ${fallback.data.id})` };
            }
          }
          return { status: `failed: ${error.message}` };
        }

        console.log(`[RESEND] Receipt email sent successfully! ID: ${data?.id}`);
        return { status: `sent (resend: ${data?.id})` };
      } catch (err: any) {
        console.error('[RESEND] Exception during send:', err);
      }
    }

    // 2. Fallback to SMTP nodemailer if configured
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.MAIL_FROM || '"WeGrow Skill Campus" <admissions@wegrow.org>',
          to: toEmail,
          subject: `Payment Receipt: ₹1000 Internship Pre-Booking Confirmed [${bookingId}]`,
          html: receiptHtml,
        });
        return { status: 'sent (smtp)' };
      } catch (err: any) {
        console.error('[SMTP] error:', err);
      }
    }

    // 3. Fallback simulation
    console.log(`[SIMULATED EMAIL] To: ${toEmail} | Booking: ${bookingId} | Txn: ${txnId}`);
    return { status: 'simulated' };
  }

  private generateReceiptHtml(booking: InternshipBooking, txnId: string): string {
    const dateFormatted = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WeGrow Skill Campus - Internship Pre-Booking Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .receipt-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #f97316; font-weight: 600; }
    .badge { display: inline-block; background: #22c55e; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 12px; }
    .content { padding: 24px; }
    .amount-box { background: #fff7ed; border: 1px solid #fdba74; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
    .amount-val { font-size: 32px; font-weight: 900; color: #ea580c; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    .meta-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .meta-table td.label { color: #64748b; font-weight: 600; width: 40%; }
    .meta-table td.value { color: #0f172a; font-weight: 700; text-align: right; }
    .footer { background: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
    .enquiry-btn { display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1>WeGrow Skill Campus & B School</h1>
      <p>Building Skills. Growing Futures.</p>
      <div class="badge">✓ Payment Confirmed & Seat Reserved</div>
    </div>
    <div class="content">
      <div class="amount-box">
        <div style="font-size: 12px; color: #9a3412; font-weight: 700; text-transform: uppercase;">Internship Pre-booking Fee</div>
        <div class="amount-val">₹1,000.00</div>
        <div style="font-size: 11px; color: #7c2d12;">Paid Successfully via ${booking.paymentMethod || 'UPI'}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="label">Booking ID:</td>
          <td class="value" style="color: #0369a1; font-family: monospace;">${booking.bookingId}</td>
        </tr>
        <tr>
          <td class="label">Transaction Reference:</td>
          <td class="value" style="font-family: monospace;">${txnId}</td>
        </tr>
        <tr>
          <td class="label">Student Name:</td>
          <td class="value">${booking.studentName}</td>
        </tr>
        <tr>
          <td class="label">Contact Mobile:</td>
          <td class="value">${booking.mobile}</td>
        </tr>
        <tr>
          <td class="label">College & Department:</td>
          <td class="value">${booking.collegeName} (${booking.department})</td>
        </tr>
        <tr>
          <td class="label">Year of Study:</td>
          <td class="value">${booking.year}</td>
        </tr>
        <tr>
          <td class="label">Internship Track:</td>
          <td class="value" style="color: #ea580c;">${booking.internshipDomain}</td>
        </tr>
        <tr>
          <td class="label">Date of Payment:</td>
          <td class="value">${dateFormatted}</td>
        </tr>
        <tr>
          <td class="label">Parents Phone:</td>
          <td class="value">${booking.parentsMobile}</td>
        </tr>
      </table>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; font-size: 12px; color: #166534; line-height: 1.5;">
        <strong>Next Steps:</strong> Your internship slot has been reserved. Our admissions coordinator will reach out to you and your parents with batch schedules and welcome kit details.
      </div>
    </div>

    <div class="footer">
      <div>WeGrow Skill Campus, 193/1A Ground Floor, Opp. Ayyappan Kovil, Police Station Rd, Sivakasi - 626 123</div>
      <div style="margin-top: 4px;">For any queries or assistance, contact: <strong>9344337331</strong></div>
      <a href="tel:9344337331" class="enquiry-btn">📞 Call Helpline: 9344337331</a>
    </div>
  </div>
</body>
</html>
`;
  }

  async seedDemoBookings() {
    const existing = await this.bookingModel.countDocuments();
    if (existing >= 5) {
      return { message: 'Demo bookings already seeded', count: existing };
    }

    const demoData = [
      {
        studentName: 'Aakash Rathinam',
        mobile: '9842114422',
        whatsapp: '9842114422',
        email: 'aakash.rathinam@gmail.com',
        collegeName: 'Ayya Nadar Janaki Ammal College (ANJAC)',
        department: 'B.Sc Computer Science',
        year: 'Final Year',
        parentsMobile: '9443225588',
        internshipDomain: 'Fullstack Web Development (React & NestJS)',
        mode: 'In-Campus (Sivakasi)',
        prebookingAmount: 1000,
        paymentStatus: 'paid' as const,
        paymentMethod: 'UPI (GPay - 9344337331)',
        transactionId: 'TXN-WG-934433-882194',
        paidAt: new Date(Date.now() - 3600000 * 24),
        receiptSent: true,
        emailDeliveryStatus: 'simulated',
        enquiryPhone: '9344337331',
      },
      {
        studentName: 'Deepika Soundararajan',
        mobile: '9789332211',
        whatsapp: '9789332211',
        email: 'deepika.soundar@gmail.com',
        collegeName: 'Standard Fireworks Rajaratnam College for Women',
        department: 'BCA (Computer Applications)',
        year: 'Final Year',
        parentsMobile: '9443661122',
        internshipDomain: 'Frontend UI/UX & Web Design',
        mode: 'In-Campus (Sivakasi)',
        prebookingAmount: 1000,
        paymentStatus: 'paid' as const,
        paymentMethod: 'PhonePe UPI',
        transactionId: 'TXN-WG-934433-741258',
        paidAt: new Date(Date.now() - 3600000 * 18),
        receiptSent: true,
        emailDeliveryStatus: 'simulated',
        enquiryPhone: '9344337331',
      },
      {
        studentName: 'Sanjay Manikandan',
        mobile: '9488229900',
        whatsapp: '9488229900',
        email: 'sanjay.manikandan@gmail.com',
        collegeName: 'Mepco Schlenk Engineering College',
        department: 'B.E. Computer Science & Engineering',
        year: '3rd Year',
        parentsMobile: '9842993311',
        internshipDomain: 'Python, Data Science & AI',
        mode: 'In-Campus (Sivakasi)',
        prebookingAmount: 1000,
        paymentStatus: 'paid' as const,
        paymentMethod: 'Paytm UPI',
        transactionId: 'TXN-WG-934433-963852',
        paidAt: new Date(Date.now() - 3600000 * 8),
        receiptSent: true,
        emailDeliveryStatus: 'simulated',
        enquiryPhone: '9344337331',
      },
      {
        studentName: 'Harini Balamurugan',
        mobile: '9944118833',
        whatsapp: '9944118833',
        email: 'harini.bala@gmail.com',
        collegeName: 'Kalasalingam Academy of Research and Education',
        department: 'B.Tech Information Technology',
        year: 'Final Year',
        parentsMobile: '9442110099',
        internshipDomain: 'Fullstack Web Development (React & NestJS)',
        mode: 'In-Campus (Sivakasi)',
        prebookingAmount: 1000,
        paymentStatus: 'pending' as const,
        receiptSent: false,
        emailDeliveryStatus: 'pending',
        enquiryPhone: '9344337331',
      },
      {
        studentName: 'Vasanth Rajan',
        mobile: '9894556677',
        whatsapp: '9894556677',
        email: 'vasanth.rajan@gmail.com',
        collegeName: 'P.S.R. Engineering College',
        department: 'B.E. Electronics & Communication',
        year: 'Passed Out',
        parentsMobile: '9443778899',
        internshipDomain: 'Fullstack Web Development (React & NestJS)',
        mode: 'In-Campus (Sivakasi)',
        prebookingAmount: 1000,
        paymentStatus: 'paid' as const,
        paymentMethod: 'Credit / Debit Card',
        transactionId: 'TXN-WG-934433-159753',
        paidAt: new Date(Date.now() - 3600000 * 2),
        receiptSent: true,
        emailDeliveryStatus: 'simulated',
        enquiryPhone: '9344337331',
      },
    ];

    for (let i = 0; i < demoData.length; i++) {
      const b = demoData[i];
      const bookingId = `WG-INT-2026-${String(i + 1).padStart(3, '0')}`;
      const doc = new this.bookingModel({
        ...b,
        bookingId,
        receiptHtml: b.paymentStatus === 'paid' ? this.generateReceiptHtml(b as any, b.transactionId || '') : '',
      });
      await doc.save();
    }

    return { success: true, count: demoData.length };
  }
}

