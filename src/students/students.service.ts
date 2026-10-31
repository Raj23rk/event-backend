import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Student, StudentDocument } from './schemas/student.schema';
import { Assessment, AssessmentDocument } from '../assessment/schemas/assessment.schema';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
  ) {}

  /**
   * Robust generator for next sequential registration number: WG-2026-001, 002, etc.
   */
  async getNextRegistrationNumber(): Promise<string> {
    const latest = await this.studentModel
      .findOne({ registrationNumber: /^WG-2026-\d+$/ })
      .sort({ createdAt: -1 })
      .exec();

    let nextSeq = 1;
    if (latest && latest.registrationNumber) {
      const match = latest.registrationNumber.match(/WG-2026-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    } else {
      const count = await this.studentModel.countDocuments();
      nextSeq = count + 1;
    }

    let candidate = `WG-2026-${String(nextSeq).padStart(3, '0')}`;
    while (await this.studentModel.exists({ registrationNumber: candidate })) {
      nextSeq++;
      candidate = `WG-2026-${String(nextSeq).padStart(3, '0')}`;
    }

    return candidate;
  }

  /**
   * Register a new student and store details in MongoDB.
   */
  async register(dto: CreateStudentDto): Promise<Student> {
    const studentName = (
      dto.studentName ||
      (dto as any).name ||
      (dto as any).fullName ||
      ''
    ).trim();

    const email = (
      dto.email ||
      (dto as any).studentEmail ||
      ''
    ).trim().toLowerCase();

    const mobile = (
      dto.mobile ||
      (dto as any).phone ||
      (dto as any).phoneNumber ||
      ''
    ).trim();

    const collegeName = (
      dto.collegeName ||
      (dto as any).college ||
      ''
    ).trim();

    const courseYear = (
      dto.courseYear ||
      (dto as any).course ||
      (dto as any).year ||
      ''
    ).trim();

    if (!studentName) throw new BadRequestException('Student name is required');
    if (!mobile) throw new BadRequestException('Mobile number is required');
    if (!email) throw new BadRequestException('Email address is required');
    if (!collegeName) throw new BadRequestException('College name is required');
    if (!courseYear) throw new BadRequestException('Course and year are required');

    const registrationNumber = await this.getNextRegistrationNumber();

    const newStudent = new this.studentModel({
      ...dto,
      studentName,
      email,
      mobile,
      collegeName,
      courseYear,
      age: dto.age ? Number(dto.age) : undefined,
      registrationNumber,
      studentId: registrationNumber,
      status: 'registered',
      careerInterests: Array.isArray(dto.careerInterests) ? dto.careerInterests : [],
      selectedDomain: dto.selectedDomain || 'HTML & CSS Web Development',
      attendedBefore: dto.attendedBefore || 'No',
      hearAbout: dto.hearAbout || 'Social Media',
      city: dto.city || 'Sivakasi',
      gender: dto.gender || 'Male',
      medium: dto.medium || 'English',
      assessmentScore: 0,
      assessmentPercentage: 0,
    });

    return await newStudent.save();
  }

  /**
   * Find students with optional search, filters, pagination, and sorting.
   */
  async findAll(query: any = {}) {
    const filter: any = {};

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.domain && query.domain !== 'all') {
      filter.selectedDomain = query.domain;
    }

    if (query.college) {
      filter.collegeName = { $regex: query.college, $options: 'i' };
    }

    if (query.gender && query.gender !== 'all') {
      filter.gender = { $regex: `^${query.gender}$`, $options: 'i' };
    }

    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { studentName: { $regex: s, $options: 'i' } },
        { registrationNumber: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } },
        { collegeName: { $regex: s, $options: 'i' } },
        { city: { $regex: s, $options: 'i' } },
        { department: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    const total = await this.studentModel.countDocuments(filter);

    // If pagination is requested via page or limit
    if (query.page || query.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const data = await this.studentModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Default: return array directly (preserves frontend compatibility)
    return this.studentModel.find(filter).sort(sort).lean().exec();
  }

  /**
   * Find single student with all core details + complete assessment record.
   */
  async findById(id: string): Promise<any> {
    let student: any = null;

    if (isValidObjectId(id)) {
      student = await this.studentModel.findById(id).lean().exec();
    }

    if (!student) {
      const trimmed = id.trim();
      student = await this.studentModel
        .findOne({
          $or: [
            { registrationNumber: trimmed.toUpperCase() },
            { studentId: trimmed },
          ],
        })
        .lean()
        .exec();
    }

    if (!student) {
      throw new NotFoundException(`Student with identifier "${id}" not found`);
    }

    // Attach assessment details if exists
    let assessment: any = null;
    if (student.assessmentSessionId) {
      assessment = await this.assessmentModel
        .findById(student.assessmentSessionId)
        .lean()
        .exec();
    }

    if (!assessment) {
      assessment = await this.assessmentModel
        .findOne({ studentId: new Types.ObjectId(student._id.toString()) })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }

    return {
      ...student,
      assessment: assessment || null,
    };
  }

  /**
   * Find student by unique registration number.
   */
  async findByRegNo(regNo: string): Promise<any> {
    const student = await this.studentModel
      .findOne({ registrationNumber: regNo.toUpperCase().trim() })
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException(`Student with Reg No "${regNo}" not found`);
    }

    let assessment: any = null;
    if (student.assessmentSessionId) {
      assessment = await this.assessmentModel.findById(student.assessmentSessionId).lean().exec();
    }
    if (!assessment) {
      assessment = await this.assessmentModel
        .findOne({ studentId: new Types.ObjectId(student._id.toString()) })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }

    return {
      ...student,
      assessment: assessment || null,
    };
  }

  /**
   * Find student by mobile number.
   */
  async findByMobile(mobile: string): Promise<StudentDocument | null> {
    return this.studentModel.findOne({ mobile: mobile.trim() }).exec();
  }

  /**
   * Find student by email address.
   */
  async findByEmail(email: string): Promise<StudentDocument | null> {
    return this.studentModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  /**
   * Update student details (Admin Edit).
   */
  async update(id: string, updateData: UpdateStudentDto | any): Promise<Student> {
    let studentId = id;

    if (!isValidObjectId(id)) {
      const found = await this.studentModel.findOne({ registrationNumber: id.toUpperCase() }).exec();
      if (!found) {
        throw new NotFoundException(`Student with identifier "${id}" not found`);
      }
      studentId = found._id.toString();
    }

    const updated = await this.studentModel
      .findByIdAndUpdate(studentId, { $set: updateData }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }

    return updated;
  }

  /**
   * Delete student and clean up their assessment sessions.
   */
  async delete(id: string): Promise<boolean> {
    let studentId = id;
    let studentDoc: any = null;

    if (isValidObjectId(id)) {
      studentDoc = await this.studentModel.findById(id).exec();
    }

    if (!studentDoc) {
      studentDoc = await this.studentModel.findOne({ registrationNumber: id.toUpperCase() }).exec();
    }

    if (!studentDoc) {
      throw new NotFoundException(`Student with identifier "${id}" not found`);
    }

    studentId = studentDoc._id.toString();

    // Delete associated assessments
    await this.assessmentModel.deleteMany({
      $or: [
        { studentId: new Types.ObjectId(studentId) },
        { registrationNumber: studentDoc.registrationNumber },
      ],
    }).exec();

    const res = await this.studentModel.findByIdAndDelete(studentId).exec();
    return !!res;
  }

  /**
   * Bulk delete multiple students by IDs.
   */
  async deleteBulk(ids: string[]): Promise<{ deletedCount: number }> {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0 };
    }

    const objectIds = ids
      .filter(id => isValidObjectId(id))
      .map(id => new Types.ObjectId(id));

    // Delete associated assessments
    await this.assessmentModel.deleteMany({ studentId: { $in: objectIds } }).exec();

    // Delete students
    const result = await this.studentModel.deleteMany({ _id: { $in: objectIds } }).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Reset assessment for a student (allows student to re-take).
   */
  async resetAssessment(id: string): Promise<Student> {
    const student = await this.findById(id);

    // Remove assessment sessions
    await this.assessmentModel.deleteMany({
      $or: [
        { studentId: new Types.ObjectId(student._id.toString()) },
        { registrationNumber: student.registrationNumber },
      ],
    }).exec();

    const updated = await this.studentModel
      .findByIdAndUpdate(
        student._id,
        {
          $set: {
            status: 'registered',
            assessmentSessionId: null,
            assessmentScore: 0,
            assessmentPercentage: 0,
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Failed to reset assessment for student "${id}"`);
    }

    return updated;
  }

  /**
   * Comprehensive summary & analytics for Admin Dashboard.
   */
  async getBatchSummary() {
    const totalCount = await this.studentModel.countDocuments();
    const completedCount = await this.studentModel.countDocuments({ status: 'completed' });
    const inProgressCount = await this.studentModel.countDocuments({ status: 'assessment_started' });
    const registeredCount = await this.studentModel.countDocuments({ status: 'registered' });

    const completedStudents = await this.studentModel
      .find({ status: 'completed' })
      .select('assessmentScore assessmentPercentage')
      .lean()
      .exec();

    let highestScore = 0;
    let lowestScore = completedStudents.length > 0 ? 100 : 0;
    let sumScore = 0;
    let sumPercentage = 0;

    for (const s of completedStudents) {
      const score = s.assessmentScore || 0;
      const pct = s.assessmentPercentage || 0;
      sumScore += score;
      sumPercentage += pct;

      if (pct > highestScore) highestScore = pct;
      if (pct < lowestScore) lowestScore = pct;
    }

    const count = completedStudents.length;
    const avgScore = count > 0 ? (sumScore / count).toFixed(1) : '0';
    const avgPercentage = count > 0 ? (sumPercentage / count).toFixed(1) : '0';

    // College distribution aggregation
    const collegesAgg = await this.studentModel.aggregate([
      { $group: { _id: '$collegeName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Domain distribution aggregation
    const domainsAgg = await this.studentModel.aggregate([
      { $group: { _id: '$selectedDomain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Gender distribution aggregation
    const genderAgg = await this.studentModel.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    return {
      quotaTarget: 30,
      totalRegistered: totalCount,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: registeredCount,
      averageScore: Number(avgScore),
      averagePercentage: Number(avgPercentage),
      highestPercentage: highestScore,
      lowestPercentage: count > 0 ? lowestScore : 0,
      topColleges: collegesAgg.map(c => ({ collegeName: c._id || 'Unknown', count: c.count })),
      domainDistribution: domainsAgg.map(d => ({ domain: d._id || 'Unknown', count: d.count })),
      genderDistribution: genderAgg.map(g => ({ gender: g._id || 'Other', count: g.count })),
    };
  }

  /**
   * Export all student records formatted for CSV / Excel download in Admin.
   */
  async getExportData() {
    const students = await this.studentModel.find().sort({ createdAt: -1 }).lean().exec();

    return students.map((s, index) => ({
      slNo: index + 1,
      id: s._id.toString(),
      registrationNumber: s.registrationNumber,
      studentName: s.studentName,
      email: s.email,
      mobile: s.mobile,
      whatsapp: s.whatsapp || s.mobile,
      gender: s.gender || 'Male',
      dob: s.dob || '',
      age: s.age || '',
      parentName: s.parentName || '',
      parentOccupation: s.parentOccupation || '',
      parentMobile: s.parentMobile || '',
      collegeName: s.collegeName,
      department: s.department || '',
      courseYear: s.courseYear,
      rollNumber: s.rollNumber || '',
      boardUniversity: s.boardUniversity || '',
      medium: s.medium || 'English',
      lastExamPercentage: s.lastExamPercentage || '',
      city: s.city || 'Sivakasi',
      residentialAddress: s.residentialAddress || '',
      pincode: s.pincode || '',
      selectedDomain: s.selectedDomain,
      careerInterests: (s.careerInterests || []).join(', '),
      dreamCareer: s.dreamCareer || '',
      workshopExpectation: s.workshopExpectation || '',
      attendedBefore: s.attendedBefore || 'No',
      hearAbout: s.hearAbout || 'Social Media',
      status: s.status,
      assessmentScore: s.assessmentScore || 0,
      assessmentPercentage: s.assessmentPercentage || 0,
      adminNotes: s.adminNotes || '',
      registeredAt: (s as any).createdAt ? new Date((s as any).createdAt).toISOString() : '',
    }));
  }
}
