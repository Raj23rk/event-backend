import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InternshipBooking, InternshipBookingSchema } from './schemas/internship-booking.schema';
import { InternshipsService } from './internships.service';
import { InternshipsController } from './internships.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InternshipBooking.name, schema: InternshipBookingSchema },
    ]),
  ],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}

