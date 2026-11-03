import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentsModule } from './students/students.module';
import { QuestionsModule } from './questions/questions.module';
import { AssessmentModule } from './assessment/assessment.module';
import { ReportsModule } from './reports/reports.module';
import { InternshipsModule } from './internships/internships.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri =
          configService.get<string>('DATABASE_URL') ||
          configService.get<string>('MONGODB_URI') ||
          process.env.DATABASE_URL ||
          process.env.MONGODB_URI ||
          'mongodb://127.0.0.1:27017/wegrow_workshop';
        return {
          uri,
        };
      },
    }),
    StudentsModule,
    QuestionsModule,
    AssessmentModule,
    ReportsModule,
    InternshipsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
