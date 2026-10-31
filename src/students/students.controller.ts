import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * 1. Register a new student
   * POST /api/students/register
   */
  @Post('register')
  async register(@Body() createDto: CreateStudentDto) {
    return this.studentsService.register(createDto);
  }

  /**
   * 2. Create student (Standard REST alias)
   * POST /api/students
   */
  @Post()
  async create(@Body() createDto: CreateStudentDto) {
    return this.studentsService.register(createDto);
  }

  /**
   * 3. Batch Summary & Stats for Admin Dashboard
   * GET /api/students/batch-summary
   */
  @Get('batch-summary')
  async getBatchSummary() {
    return this.studentsService.getBatchSummary();
  }

  /**
   * 4. Admin Overview & Analytics Metrics
   * GET /api/students/admin/overview
   */
  @Get('admin/overview')
  async getAdminOverview() {
    return this.studentsService.getBatchSummary();
  }

  /**
   * 5. Export student records (for CSV / Excel download)
   * GET /api/students/export
   */
  @Get('export')
  async getExportData() {
    return this.studentsService.getExportData();
  }

  /**
   * 6. Bulk Delete Students (Admin power action)
   * POST /api/students/bulk-delete
   */
  @Post('bulk-delete')
  async bulkDelete(@Body('ids') ids: string[]) {
    return this.studentsService.deleteBulk(ids);
  }

  /**
   * 7. Find student by Registration Number (WG-2026-XXX)
   * GET /api/students/by-reg/:regNo
   */
  @Get('by-reg/:regNo')
  async findByRegNo(@Param('regNo') regNo: string) {
    return this.studentsService.findByRegNo(regNo);
  }

  /**
   * 8. Find student by Mobile Number
   * GET /api/students/by-mobile/:mobile
   */
  @Get('by-mobile/:mobile')
  async findByMobile(@Param('mobile') mobile: string) {
    return this.studentsService.findByMobile(mobile);
  }

  /**
   * 9. Find student by Email
   * GET /api/students/by-email/:email
   */
  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.studentsService.findByEmail(email);
  }

  /**
   * 10. Reset assessment for a student
   * POST /api/students/:id/reset-assessment
   */
  @Post(':id/reset-assessment')
  async resetAssessment(@Param('id') id: string) {
    return this.studentsService.resetAssessment(id);
  }

  /**
   * 11. List all students (with search, filter, pagination, sorting)
   * GET /api/students
   * Query params: search, status, domain, college, gender, page, limit, sortBy, sortOrder
   */
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('domain') domain?: string,
    @Query('college') college?: string,
    @Query('gender') gender?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.studentsService.findAll({
      search,
      status,
      domain,
      college,
      gender,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  /**
   * 12. View single student complete details (Core Profile + Full Assessment Report)
   * GET /api/students/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.studentsService.findById(id);
  }

  /**
   * 13. Update student details (Admin Edit)
   * PUT /api/students/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateDto);
  }

  /**
   * 14. Partial update student details
   * PATCH /api/students/:id
   */
  @Patch(':id')
  async patchUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, updateDto);
  }

  /**
   * 15. Delete single student & associated records
   * DELETE /api/students/:id
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const success = await this.studentsService.delete(id);
    return { success, message: 'Student and related records deleted successfully' };
  }
}
