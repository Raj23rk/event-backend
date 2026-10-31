import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Question, QuestionDocument } from '../questions/schemas/question.schema';
import { QuestionsService } from '../questions/questions.service';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private questionsService: QuestionsService,
  ) {}

  async startAssessment(studentId: string, questionCount: number = 15): Promise<any> {
    const student = await this.studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if session already exists
    if (student.assessmentSessionId) {
      const existingSession = await this.assessmentModel.findById(student.assessmentSessionId);
      if (existingSession) {
        if (existingSession.status === 'submitted') {
          return existingSession;
        }
        // Return active session sanitized
        return this.sanitizeSessionForTest(existingSession);
      }
    }

    // Pick randomized distinct question set for this student
    const pickedQuestions = await this.questionsService.getRandomSet(questionCount);
    if (pickedQuestions.length === 0) {
      throw new BadRequestException('No assessment questions available in the question bank.');
    }

    // Prepare questions with per-student shuffled options
    const sessionQuestions = pickedQuestions.map(q => {
      // Shuffle options for anti-cheat
      const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);

      return {
        questionId: (q as any)._id as Types.ObjectId,
        questionText: q.questionText,
        codeSnippet: q.codeSnippet || '',
        category: q.category,
        difficulty: q.difficulty,
        options: shuffledOptions,
        selectedAnswer: '',
        correctAnswer: q.correctAnswer,
        isCorrect: false,
        explanation: q.explanation,
        isCustom: q.isCustom || false,
        timeSpentSeconds: 0,
      };
    });

    const newAssessment = new this.assessmentModel({
      studentId: student._id,
      registrationNumber: student.registrationNumber,
      studentName: student.studentName,
      selectedDomain: student.selectedDomain,
      questions: sessionQuestions,
      totalQuestions: sessionQuestions.length,
      score: 0,
      maxScore: sessionQuestions.length,
      percentage: 0,
      status: 'in-progress',
      startedAt: new Date(),
    });

    const savedAssessment = await newAssessment.save();

    // Link session to student
    student.assessmentSessionId = savedAssessment._id.toString();
    student.status = 'assessment_started';
    await student.save();

    return this.sanitizeSessionForTest(savedAssessment);
  }

  async submitAssessment(sessionId: string, dto: SubmitAssessmentDto): Promise<Assessment> {
    const assessment = await this.assessmentModel.findById(sessionId);
    if (!assessment) {
      throw new NotFoundException('Assessment session not found');
    }

    if (assessment.status === 'submitted') {
      return assessment;
    }

    const answersMap = new Map<string, { answer: string; timeSpent?: number }>();
    if (dto.answers && Array.isArray(dto.answers)) {
      for (const item of dto.answers) {
        answersMap.set(item.questionId, {
          answer: item.selectedAnswer,
          timeSpent: item.timeSpentSeconds || 0,
        });
      }
    }

    let correctCount = 0;
    const categoryStats: Record<string, { score: number; total: number; percentage: number }> = {};

    for (const q of assessment.questions) {
      const qIdStr = q.questionId.toString();
      const submission = answersMap.get(qIdStr);
      const chosen = submission ? submission.answer : '';
      const timeSpent = submission ? submission.timeSpent || 0 : 0;

      q.selectedAnswer = chosen;
      q.timeSpentSeconds = timeSpent;
      q.isCorrect = chosen === q.correctAnswer;

      if (q.isCorrect) {
        correctCount++;
      }

      // Tally category
      const cat = q.category || 'General';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { score: 0, total: 0, percentage: 0 };
      }
      categoryStats[cat].total++;
      if (q.isCorrect) {
        categoryStats[cat].score++;
      }
    }

    // Compute category percentages
    for (const key of Object.keys(categoryStats)) {
      const item = categoryStats[key];
      item.percentage = Number(((item.score / item.total) * 100).toFixed(1));
    }

    const totalQuestions = assessment.questions.length;
    const percentage = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(1)) : 0;

    // Determine Skill Band
    let skillBand = 'Foundational (Needs Guided Practice)';
    if (percentage >= 85) {
      skillBand = 'Industry Ready (High Aptitude)';
    } else if (percentage >= 70) {
      skillBand = 'Proficient (Job Ready Junior)';
    } else if (percentage >= 50) {
      skillBand = 'Developing (Strong Fundamentals)';
    }

    // Generate personalized Career Guidance Recommendation
    const student = await this.studentModel.findById(assessment.studentId);
    const interests = student?.careerInterests || [];
    const recommendation = this.generateCareerGuidance(percentage, categoryStats, interests, student?.dreamCareer);

    assessment.score = correctCount;
    assessment.maxScore = totalQuestions;
    assessment.percentage = percentage;
    assessment.categoryBreakdown = categoryStats;
    assessment.skillBand = skillBand;
    assessment.careerRecommendation = recommendation;
    assessment.status = 'submitted';
    assessment.submittedAt = new Date();
    assessment.timeTakenSeconds = dto.totalTimeSeconds || Math.round((Date.now() - assessment.startedAt.getTime()) / 1000);

    const saved = await assessment.save();

    // Update student status & final score
    if (student) {
      student.status = 'completed';
      student.assessmentScore = correctCount;
      student.assessmentPercentage = percentage;
      await student.save();
    }

    return saved;
  }

  async getSession(sessionId: string): Promise<any> {
    const assessment = await this.assessmentModel.findById(sessionId);
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    if (assessment.status === 'in-progress') {
      return this.sanitizeSessionForTest(assessment);
    }
    return assessment;
  }

  async getStudentAssessment(studentId: string): Promise<Assessment | null> {
    return this.assessmentModel.findOne({ studentId, status: 'submitted' }).sort({ submittedAt: -1 }).exec();
  }

  private sanitizeSessionForTest(assessment: AssessmentDocument) {
    const raw = assessment.toObject();
    // Hide answers while taking exam
    raw.questions = raw.questions.map((q: any) => ({
      _id: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      codeSnippet: q.codeSnippet,
      category: q.category,
      difficulty: q.difficulty,
      options: q.options,
      selectedAnswer: q.selectedAnswer || '',
      isCustom: q.isCustom,
    }));
    return raw;
  }

  private generateCareerGuidance(
    percentage: number,
    categoryStats: Record<string, { score: number; total: number; percentage: number }>,
    interests: string[],
    dreamCareer?: string,
  ) {
    const htmlPerf = categoryStats['HTML']?.percentage ?? 50;
    const cssPerf = categoryStats['CSS']?.percentage ?? 50;

    let roleTitle = 'Frontend Web Developer & UI Designer';
    let description = '';
    const suitableTracks: string[] = [];
    const strengths: string[] = [];
    const growthAreas: string[] = [];
    const actionPlan: string[] = [];

    if (percentage >= 80) {
      roleTitle = 'Associate Frontend Engineer / UI Developer';
      description = `Outstanding performance! You have demonstrated exceptional mastery of core HTML5 semantic architecture and modern CSS layouts (Flexbox, Grid, Responsive Media Queries). You are well positioned to target competitive entry-level frontend software engineering positions.`;
      suitableTracks.push('Frontend React / Modern UI Engineering', 'Fullstack JavaScript / Nest.js Development', 'Web Performance & Accessibility Specialist');
      actionPlan.push('Build 2 comprehensive portfolio projects with React, Tailwind CSS, and API integration');
      actionPlan.push('Learn advanced state management and component lifecycle optimization');
      actionPlan.push('Prepare for technical coding interviews with Git version control and GitHub presence');
    } else if (percentage >= 60) {
      roleTitle = 'Junior Web Developer / UI Designer';
      description = `Good foundational grasp! You understand HTML structure well and have solid working knowledge of CSS properties. With targeted practical drills on advanced CSS layouting, specificity, and responsiveness, you can quickly achieve job readiness.`;
      suitableTracks.push('Junior Web Developer', 'UI / UX Implementation Designer', 'CMS / WordPress & E-Commerce Web Customizer');
      actionPlan.push('Strengthen responsive web design practices using mobile-first CSS media queries');
      actionPlan.push('Practice CSS Flexbox & Grid layouts through hands-on cloning of real website landing pages');
      actionPlan.push('Enroll in WeGrow Skill Campus project-based bootcamp modules');
    } else {
      roleTitle = 'Web Design & Digital Solutions Specialist';
      description = `Encouraging start! You show an aptitude for web technologies and design fundamentals. Focusing on structured practice in HTML semantic tags, CSS Box Model, and layout positioning will dramatically accelerate your development skills.`;
      suitableTracks.push('Web Content & Design Associate', 'Digital Marketing & Web Coordinator', 'Junior Frontend Intern');
      actionPlan.push('Revise the CSS Box Model (Margin, Border, Padding, Content) through interactive code exercises');
      actionPlan.push('Master standard HTML5 forms, accessibility labels, and semantic document structures');
      actionPlan.push('Attend WeGrow Skill Campus mentor-guided practice labs');
    }

    if (htmlPerf >= 70) {
      strengths.push('Clean Semantic HTML5 Tagging & Document Structure');
    } else {
      growthAreas.push('Semantic HTML5 elements (<article>, <section>, <fieldset>) & Accessibility');
    }

    if (cssPerf >= 70) {
      strengths.push('Modern CSS Layouts (Flexbox, Grid & Positioning)');
    } else {
      growthAreas.push('CSS Box Model, specificity hierarchy, and responsive breakpoint design');
    }

    // Incorporate student's dream or selected interests
    if (interests.includes('Graphic / Video Editing') || interests.includes('Design / Arts')) {
      suitableTracks.push('UI/UX Product Designer & Design Systems Developer');
    }
    if (interests.includes('Data Analytics')) {
      suitableTracks.push('Frontend Dashboard & Data Visualization Specialist (D3.js / Chart.js)');
    }
    if (interests.includes('Digital Marketing')) {
      suitableTracks.push('Technical SEO & Growth Web Engineer');
    }

    return {
      roleTitle,
      description,
      suitableTracks: Array.from(new Set(suitableTracks)),
      strengths,
      growthAreas,
      actionPlan,
    };
  }
}
