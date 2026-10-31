import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Assessment, AssessmentDocument } from '../assessment/schemas/assessment.schema';
import { Question, QuestionDocument } from '../questions/schemas/question.schema';
import { QuestionsService } from '../questions/questions.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private questionsService: QuestionsService,
  ) {}

  async getWorkshopOverview() {
    const totalRegistered = await this.studentModel.countDocuments();
    const completedAssessments = await this.assessmentModel.find({ status: 'submitted' }).exec();
    const completedCount = completedAssessments.length;

    let avgPercentage = 0;
    let highestPercentage = 0;
    let lowestPercentage = 100;
    let totalScore = 0;
    let totalMax = 0;

    const categoryAggregates: Record<string, { totalScore: number; totalMax: number }> = {};
    const scoreBands = {
      '90-100%': 0,
      '75-89%': 0,
      '50-74%': 0,
      'Below 50%': 0,
    };

    if (completedCount > 0) {
      let sumPct = 0;
      for (const a of completedAssessments) {
        sumPct += a.percentage;
        totalScore += a.score;
        totalMax += a.maxScore;

        if (a.percentage > highestPercentage) highestPercentage = a.percentage;
        if (a.percentage < lowestPercentage) lowestPercentage = a.percentage;

        if (a.percentage >= 90) scoreBands['90-100%']++;
        else if (a.percentage >= 75) scoreBands['75-89%']++;
        else if (a.percentage >= 50) scoreBands['50-74%']++;
        else scoreBands['Below 50%']++;

        if (a.categoryBreakdown) {
          for (const [cat, data] of Object.entries(a.categoryBreakdown)) {
            if (!categoryAggregates[cat]) {
              categoryAggregates[cat] = { totalScore: 0, totalMax: 0 };
            }
            categoryAggregates[cat].totalScore += (data as any).score || 0;
            categoryAggregates[cat].totalMax += (data as any).total || 0;
          }
        }
      }
      avgPercentage = Number((sumPct / completedCount).toFixed(1));
    } else {
      lowestPercentage = 0;
    }

    const domainAverages: Record<string, number> = {};
    for (const [cat, stats] of Object.entries(categoryAggregates)) {
      domainAverages[cat] = stats.totalMax > 0
        ? Number(((stats.totalScore / stats.totalMax) * 100).toFixed(1))
        : 0;
    }

    // Career interests tally across all registered students
    const allStudents = await this.studentModel.find().select('careerInterests').lean().exec();
    const interestCounts: Record<string, number> = {};
    for (const s of allStudents) {
      if (s.careerInterests && Array.isArray(s.careerInterests)) {
        for (const interest of s.careerInterests) {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        }
      }
    }

    return {
      quotaTarget: 30,
      totalRegistered,
      completedAssessments: completedCount,
      pendingAssessments: totalRegistered - completedCount,
      classAveragePercentage: avgPercentage,
      highestScorePercentage: highestPercentage,
      lowestScorePercentage: completedCount > 0 ? lowestPercentage : 0,
      domainAverages,
      scoreDistribution: scoreBands,
      careerInterestsDistribution: interestCounts,
    };
  }

  async getQuestionWiseAnalysis() {
    const allQuestions = await this.questionModel.find().lean().exec();
    const completedAssessments = await this.assessmentModel.find({ status: 'submitted' }).lean().exec();

    // Map question statistics
    const questionStatsMap = new Map<string, {
      questionId: string;
      questionText: string;
      codeSnippet: string;
      category: string;
      difficulty: string;
      isCustom: boolean;
      correctAnswer: string;
      explanation: string;
      totalAttempts: number;
      correctCount: number;
      incorrectCount: number;
      accuracyRate: number;
      difficultyRating: string;
      optionDistribution: Record<string, number>;
      successfulStudents: Array<{ regNo: string; name: string }>;
      strugglingStudents: Array<{ regNo: string; name: string; chosenAnswer: string }>;
    }>();

    for (const q of allQuestions) {
      questionStatsMap.set(q._id.toString(), {
        questionId: q._id.toString(),
        questionText: q.questionText,
        codeSnippet: q.codeSnippet || '',
        category: q.category,
        difficulty: q.difficulty,
        isCustom: !!q.isCustom,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        totalAttempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        accuracyRate: 0,
        difficultyRating: 'Unattempted',
        optionDistribution: { A: 0, B: 0, C: 0, D: 0 },
        successfulStudents: [],
        strugglingStudents: [],
      });
    }

    // Accumulate student attempts
    for (const assessment of completedAssessments) {
      const studentName = assessment.studentName;
      const regNo = assessment.registrationNumber;

      for (const item of assessment.questions) {
        const qId = item.questionId.toString();
        let stat = questionStatsMap.get(qId);

        if (!stat) {
          // If custom question created after or inline
          stat = {
            questionId: qId,
            questionText: item.questionText,
            codeSnippet: item.codeSnippet || '',
            category: item.category,
            difficulty: item.difficulty,
            isCustom: item.isCustom || false,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            totalAttempts: 0,
            correctCount: 0,
            incorrectCount: 0,
            accuracyRate: 0,
            difficultyRating: 'Unattempted',
            optionDistribution: { A: 0, B: 0, C: 0, D: 0 },
            successfulStudents: [],
            strugglingStudents: [],
          };
          questionStatsMap.set(qId, stat);
        }

        stat.totalAttempts++;

        if (item.selectedAnswer) {
          stat.optionDistribution[item.selectedAnswer] = (stat.optionDistribution[item.selectedAnswer] || 0) + 1;
        }

        if (item.isCorrect) {
          stat.correctCount++;
          stat.successfulStudents.push({ regNo, name: studentName });
        } else {
          stat.incorrectCount++;
          stat.strugglingStudents.push({
            regNo,
            name: studentName,
            chosenAnswer: item.selectedAnswer || 'Skipped',
          });
        }
      }
    }

    // Calculate rates and difficulty rating based on actual results
    const results = Array.from(questionStatsMap.values()).map(stat => {
      if (stat.totalAttempts > 0) {
        const rate = Number(((stat.correctCount / stat.totalAttempts) * 100).toFixed(1));
        stat.accuracyRate = rate;
        if (rate >= 80) stat.difficultyRating = 'Easy (Well Understood)';
        else if (rate >= 50) stat.difficultyRating = 'Moderate (Good Challenge)';
        else stat.difficultyRating = 'Challenging (Needs Workshop Review)';
      } else {
        stat.accuracyRate = 0;
        stat.difficultyRating = 'Pending Assessment';
      }
      return stat;
    });

    // Sort by custom questions first, then by lowest accuracy (most challenging)
    results.sort((a, b) => {
      if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
      return a.accuracyRate - b.accuracyRate;
    });

    return results;
  }

  async getStudentRosterAndRankings() {
    const students = await this.studentModel.find().lean().exec();
    const assessments = await this.assessmentModel.find({ status: 'submitted' }).lean().exec();

    const assessmentByStudentId = new Map<string, any>();
    for (const a of assessments) {
      assessmentByStudentId.set(a.studentId.toString(), a);
    }

    const roster = students.map(student => {
      const assessment = assessmentByStudentId.get(student._id.toString());
      return {
        id: student._id.toString(),
        registrationNumber: student.registrationNumber,
        studentName: student.studentName,
        mobile: student.mobile,
        email: student.email,
        collegeName: student.collegeName,
        courseYear: student.courseYear,
        selectedDomain: student.selectedDomain,
        careerInterests: student.careerInterests || [],
        dreamCareer: student.dreamCareer || 'Not specified',
        status: student.status,
        score: assessment ? assessment.score : 0,
        maxScore: assessment ? assessment.maxScore : 15,
        percentage: assessment ? assessment.percentage : 0,
        skillBand: assessment ? assessment.skillBand : 'Not Assessed',
        timeTakenSeconds: assessment ? assessment.timeTakenSeconds : 0,
        categoryBreakdown: assessment ? assessment.categoryBreakdown : {},
        hasCompleted: !!assessment,
        assessmentSessionId: student.assessmentSessionId,
      };
    });

    // Rank completed students by percentage desc, then timeTakenSeconds asc
    roster.sort((a, b) => {
      if (a.hasCompleted && !b.hasCompleted) return -1;
      if (!a.hasCompleted && b.hasCompleted) return 1;
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });

    // Assign rank
    let rank = 1;
    for (const r of roster) {
      if (r.hasCompleted) {
        (r as any).rank = rank++;
      } else {
        (r as any).rank = null;
      }
    }

    return roster;
  }

  async seedDemoStudents() {
    // Check if students already exist
    const count = await this.studentModel.countDocuments();
    if (count >= 15) {
      return { message: 'Demo students already seeded', count };
    }

    const colleges = [
      'Ayya Nadar Janaki Ammal College (ANJAC), Sivakasi',
      'Standard Fireworks Rajaratnam College for Women, Sivakasi',
      'Mepco Schlenk Engineering College, Sivakasi',
      'Kalasalingam Academy of Research and Education, Krishnankoil',
      'P.S.R. Engineering College, Sivakasi',
      'Thiagarajar College, Madurai',
      'Kamaraj College of Engineering & Technology, Virudhunagar',
      'V.V.Vanniaperumal College for Women, Virudhunagar',
    ];

    const courses = [
      'B.Sc Computer Science (2026 Passout)',
      'BCA (2026 Passout)',
      'B.E. Computer Science & Engineering (2026 Passout)',
      'B.Tech Information Technology (2026 Passout)',
      'B.Sc Information Technology (2026 Passout)',
      'B.Com Computer Applications (2026 Passout)',
    ];

    const sampleNames = [
      { name: 'Karthik Raja', gender: 'Male' },
      { name: 'Priya Dharshini', gender: 'Female' },
      { name: 'Saravanan M', gender: 'Male' },
      { name: 'Ananya S', gender: 'Female' },
      { name: 'Vignesh Kumar', gender: 'Male' },
      { name: 'Meenakshi Sundaram', gender: 'Female' },
      { name: 'Dinesh Balaji', gender: 'Male' },
      { name: 'Kavitha R', gender: 'Female' },
      { name: 'Hariharan S', gender: 'Male' },
      { name: 'Divya Bharathi', gender: 'Female' },
      { name: 'Santhosh M', gender: 'Male' },
      { name: 'Sneha Venkatesh', gender: 'Female' },
      { name: 'Aravind Swamy', gender: 'Male' },
      { name: 'Pavithra K', gender: 'Female' },
      { name: 'Muthu Krishnan', gender: 'Male' },
      { name: 'Abinaya Devi', gender: 'Female' },
      { name: 'Naveen Kumar', gender: 'Male' },
      { name: 'Janani Sri', gender: 'Female' },
      { name: 'Gokul Nath', gender: 'Male' },
      { name: 'Sowmya Lakshmi', gender: 'Female' },
    ];

    const createdAssessments: any[] = [];

    for (let i = 0; i < sampleNames.length; i++) {
      const s = sampleNames[i];
      const regNo = `WG-2026-${String(i + 1).padStart(3, '0')}`;
      const college = colleges[i % colleges.length];
      const course = courses[i % courses.length];

      const interests = ['Software / IT'];
      if (i % 2 === 0) interests.push('Graphic / Video Editing');
      if (i % 3 === 0) interests.push('Data Analytics');
      if (i % 4 === 0) interests.push('Digital Marketing');

      const studentDoc = new this.studentModel({
        studentName: s.name,
        dob: '2004-05-15',
        age: 22,
        gender: s.gender,
        parentName: `Mr. ${s.name.split(' ')[0]} Senior`,
        parentOccupation: 'Business / Service',
        mobile: `9842${Math.floor(100000 + Math.random() * 900000)}`,
        whatsapp: `9842${Math.floor(100000 + Math.random() * 900000)}`,
        parentMobile: `9443${Math.floor(100000 + Math.random() * 900000)}`,
        email: `${s.name.toLowerCase().replace(/[^a-z]/g, '')}${i + 1}@gmail.com`,
        residentialAddress: `${i + 10}, Gandhi Road`,
        city: 'Sivakasi',
        pincode: '626123',
        collegeName: college,
        courseYear: course,
        boardUniversity: 'Madurai Kamaraj University',
        medium: 'English',
        lastExamPercentage: `${70 + (i % 25)}%`,
        favouriteSubjects: 'Web Technologies, Programming in Python, Database Systems',
        careerInterests: interests,
        dreamCareer: i % 2 === 0 ? 'Fullstack Web Developer' : 'Frontend UI/UX Engineer',
        workshopExpectation: 'To gain deep practical industry skills in modern web development and career placement guidance.',
        attendedBefore: i % 3 === 0 ? 'Yes' : 'No',
        hearAbout: 'Social Media',
        selectedDomain: 'HTML & CSS Web Development',
        registrationNumber: regNo,
        status: 'registered',
      });

      const savedStudent = await studentDoc.save();

      // Simulate completed assessments for first 15 students
      if (i < 15) {
        const questions = await this.questionsService.getRandomSet(15);
        // Vary proficiency
        const targetCorrect = Math.min(15, Math.max(6, 9 + (i % 7)));
        let correctSoFar = 0;

        const sessionQuestions = questions.map((q, idx) => {
          const shouldBeCorrect = correctSoFar < targetCorrect && (idx % 2 === 0 || correctSoFar + (15 - idx) <= targetCorrect);
          let chosenAnswer = q.correctAnswer;
          if (!shouldBeCorrect) {
            const wrongOptions = ['A', 'B', 'C', 'D'].filter(o => o !== q.correctAnswer);
            chosenAnswer = wrongOptions[idx % wrongOptions.length];
          } else {
            correctSoFar++;
          }

          return {
            questionId: (q as any)._id as Types.ObjectId,
            questionText: q.questionText,
            codeSnippet: q.codeSnippet || '',
            category: q.category,
            difficulty: q.difficulty,
            options: q.options,
            selectedAnswer: chosenAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect: chosenAnswer === q.correctAnswer,
            explanation: q.explanation,
            isCustom: q.isCustom || false,
            timeSpentSeconds: 25 + (idx * 3),
          };
        });

        const categoryBreakdown: any = {};
        for (const item of sessionQuestions) {
          const cat = item.category || 'General';
          if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { score: 0, total: 0, percentage: 0 };
          categoryBreakdown[cat].total++;
          if (item.isCorrect) categoryBreakdown[cat].score++;
        }
        for (const k of Object.keys(categoryBreakdown)) {
          categoryBreakdown[k].percentage = Number(((categoryBreakdown[k].score / categoryBreakdown[k].total) * 100).toFixed(1));
        }

        const pct = Number(((correctSoFar / 15) * 100).toFixed(1));
        let skillBand = 'Developing (Strong Fundamentals)';
        if (pct >= 85) skillBand = 'Industry Ready (High Aptitude)';
        else if (pct >= 70) skillBand = 'Proficient (Job Ready Junior)';
        else if (pct < 50) skillBand = 'Foundational (Needs Guided Practice)';

        const assessmentDoc = new this.assessmentModel({
          studentId: savedStudent._id,
          registrationNumber: regNo,
          studentName: s.name,
          selectedDomain: 'HTML & CSS Web Development',
          questions: sessionQuestions,
          totalQuestions: 15,
          score: correctSoFar,
          maxScore: 15,
          percentage: pct,
          categoryBreakdown,
          skillBand,
          careerRecommendation: {
            roleTitle: pct >= 80 ? 'Associate Frontend Engineer' : 'Junior Web Developer & UI Designer',
            description: `Candidate from ${college} demonstrated solid understanding of responsive HTML/CSS structures with a score of ${pct}%. Recommended for industry web projects at WeGrow Skill Campus.`,
            suitableTracks: ['Frontend React Development', 'Responsive Web Design', 'UI/UX Engineering'],
            strengths: ['CSS Flexbox Layouts', 'HTML5 Semantic Tagging'],
            growthAreas: ['Advanced Grid Templates', 'Accessibility Standards'],
            actionPlan: ['Complete hands-on WeGrow frontend bootcamp', 'Build responsive portfolio website'],
          },
          status: 'submitted',
          startedAt: new Date(Date.now() - 3600000),
          submittedAt: new Date(),
          timeTakenSeconds: 520 + (i * 20),
        });

        const savedAssessment = await assessmentDoc.save();
        createdAssessments.push(savedAssessment);

        savedStudent.status = 'completed';
        savedStudent.assessmentSessionId = savedAssessment._id.toString();
        savedStudent.assessmentScore = correctSoFar;
        savedStudent.assessmentPercentage = pct;
        await savedStudent.save();
      }
    }

    return {
      success: true,
      studentsCreated: sampleNames.length,
      assessmentsCompleted: createdAssessments.length,
    };
  }
}
