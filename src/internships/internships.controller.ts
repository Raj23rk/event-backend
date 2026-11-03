import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InternshipsService } from './internships.service';
import {
  CreateInternshipBookingDto,
  ConfirmPaymentDto,
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from './dto/internship-booking.dto';

@Controller('internships')
export class InternshipsController {
  constructor(private readonly internshipsService: InternshipsService) {}

  @Post('register-and-book')
  async createBooking(@Body() dto: CreateInternshipBookingDto) {
    return this.internshipsService.createBooking(dto);
  }

  @Post('create-razorpay-order')
  async createRazorpayOrder(@Body() dto: CreateRazorpayOrderDto) {
    return this.internshipsService.createRazorpayOrder(dto.bookingId);
  }

  @Post('verify-razorpay-payment')
  async verifyRazorpayPayment(@Body() dto: VerifyRazorpayPaymentDto) {
    return this.internshipsService.verifyRazorpayPayment(dto);
  }

  @Post('confirm-payment')
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.internshipsService.confirmPayment(dto);
  }

  @Get('bookings')
  async findAll(
    @Query('search') search?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('department') department?: string,
    @Query('internshipDomain') internshipDomain?: string,
  ) {
    return this.internshipsService.findAll({ search, paymentStatus, department, internshipDomain });
  }

  @Get('stats')
  async getStats() {
    return this.internshipsService.getStats();
  }

  @Get('by-booking-id/:bookingId')
  async findByBookingId(@Param('bookingId') bookingId: string) {
    return this.internshipsService.findByBookingId(bookingId);
  }

  @Get('bookings/:id')
  async findById(@Param('id') id: string) {
    return this.internshipsService.findById(id);
  }

  @Post('resend-receipt/:id')
  async resendReceipt(@Param('id') id: string) {
    return this.internshipsService.resendReceipt(id);
  }

  @Post('seed-demo')
  async seedDemo() {
    return this.internshipsService.seedDemoBookings();
  }
}

