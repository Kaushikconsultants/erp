"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_QUESTIONS = [
  // ROUND 1: BASIC / SCREENING FIT
  { roundNumber: 1, question: "Walk us through your professional background and relevant experience.", category: "Background & Fit" },
  { roundNumber: 1, question: "How would you rate your verbal communication and interpersonal skills?", category: "Communication" },
  { roundNumber: 1, question: "What are your current CTC, expected compensation, and notice period?", category: "HR & Logistics" },
  { roundNumber: 1, question: "Why are you interested in joining our company?", category: "Motivation" },

  // ROUND 2: TECHNICAL & DOMAIN KNOWLEDGE
  { roundNumber: 2, question: "Demonstrate domain expertise and core technical competency for this role.", category: "Technical Skill" },
  { roundNumber: 2, question: "How do you approach complex problem solving and debugging difficult issues?", category: "Problem Solving" },
  { roundNumber: 2, question: "Describe a high-impact technical project you led or contributed to.", category: "Project Execution" },
  { roundNumber: 2, question: "How do you handle technical trade-offs, scalability, and code quality?", category: "Architecture & Quality" },

  // ROUND 3: FINAL / CULTURAL & LEADERSHIP
  { roundNumber: 3, question: "How well do your personal values align with our team culture and mission?", category: "Cultural Fit" },
  { roundNumber: 3, question: "How do you handle constructive feedback, conflict, and tight deadlines?", category: "Adaptability & Pressure" },
  { roundNumber: 3, question: "Where do you see yourself professionally in the next 2 to 3 years?", category: "Career Roadmap" },
  { roundNumber: 3, question: "Final alignment on offer terms, joining timeline, and leadership readiness.", category: "Executive Finalization" }
];

// Helper: Ensure default question bank exists
async function ensureDefaultQuestions() {
  const count = await prisma.interviewQuestion.count();
  if (count === 0) {
    for (const q of DEFAULT_QUESTIONS) {
      await prisma.interviewQuestion.create({ data: q });
    }
  }
}

// ---------------------------------------------------------
// CANDIDATE MANAGEMENT ACTIONS
// ---------------------------------------------------------
export async function getCandidates() {
  try {
    await ensureDefaultQuestions();
    const candidates = await prisma.candidate.findMany({
      include: {
        round1Interviewer: { include: { user: true } },
        round2Interviewer: { include: { user: true } },
        round3Interviewer: { include: { user: true } },
        evaluations: { include: { question: true } },
        roundSummaries: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, candidates };
  } catch (error: any) {
    console.error("Error fetching candidates:", error);
    return { success: false, error: error.message || "Failed to fetch candidates" };
  }
}

export async function createCandidate(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const appliedRole = formData.get("appliedRole") as string;
    const experienceYears = parseFloat((formData.get("experienceYears") as string) || "0");
    const expectedSalary = formData.get("expectedSalary") as string || "";
    const resumeUrl = formData.get("resumeUrl") as string || "";
    const referenceName = formData.get("referenceName") as string || "";

    if (!name || !email || !appliedRole) {
      return { error: "Name, Email, and Applied Role are required." };
    }

    const candidateNumber = `CAND-${Date.now().toString().slice(-5)}`;

    const candidate = await prisma.candidate.create({
      data: {
        candidateNumber,
        name,
        email,
        phone,
        appliedRole,
        experienceYears,
        expectedSalary,
        resumeUrl,
        referenceName,
        status: "NEW"
      }
    });

    revalidatePath("/hiring");
    return { success: true, candidate };
  } catch (error: any) {
    console.error("Error creating candidate:", error);
    return { error: error.message || "Failed to create candidate" };
  }
}

// Fetch all team members / employees for interviewer assignment
export async function getEmployeesForHiring() {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    if (employees.length > 0) {
      return { success: true, employees };
    }

    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    const userAsEmployees = users.map((u: any) => ({
      id: u.id,
      designation: u.role || "Team Member",
      department: "Management",
      user: { name: u.name || u.email, email: u.email }
    }));
    return { success: true, employees: userAsEmployees };
  } catch (error: any) {
    return { success: false, employees: [] };
  }
}

// Admin assigns interviewers for Round 1, Round 2, or Round 3
export async function assignInterviewerToRound(candidateId: string, roundNumber: number, interviewerId: string) {
  try {
    let updateData: any = {};
    if (roundNumber === 1) {
      updateData = { round1InterviewerId: interviewerId, status: "ROUND_1_PENDING" };
    } else if (roundNumber === 2) {
      updateData = { round2InterviewerId: interviewerId, status: "ROUND_2_PENDING" };
    } else if (roundNumber === 3) {
      updateData = { round3InterviewerId: interviewerId, status: "ROUND_3_PENDING" };
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData
    });

    revalidatePath("/hiring");
    return { success: true };
  } catch (error: any) {
    console.error("Error assigning interviewer:", error);
    return { error: error.message || "Failed to assign interviewer" };
  }
}

// ---------------------------------------------------------
// QUESTION BANK MANAGEMENT
// ---------------------------------------------------------
export async function getQuestionsByRound(roundNumber?: number) {
  try {
    await ensureDefaultQuestions();
    const where = roundNumber ? { roundNumber } : {};
    const questions = await prisma.interviewQuestion.findMany({
      where,
      orderBy: [{ roundNumber: 'asc' }, { createdAt: 'asc' }]
    });
    return { success: true, questions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addQuestion(roundNumber: number, question: string, category: string = "General") {
  try {
    if (!question.trim()) return { error: "Question text is required." };
    const q = await prisma.interviewQuestion.create({
      data: { roundNumber, question, category, isDefault: false }
    });
    revalidatePath("/hiring");
    return { success: true, question: q };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateQuestion(id: string, question: string, category?: string) {
  try {
    const q = await prisma.interviewQuestion.update({
      where: { id },
      data: { question, ...(category ? { category } : {}) }
    });
    revalidatePath("/hiring");
    return { success: true, question: q };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteQuestion(id: string) {
  try {
    await prisma.interviewQuestion.delete({ where: { id } });
    revalidatePath("/hiring");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ---------------------------------------------------------
// INTERVIEW EVALUATION SUBMISSION
// ---------------------------------------------------------
export async function submitRoundEvaluation(
  candidateId: string,
  roundNumber: number,
  ratings: { questionId: string; rating: number; notes?: string }[],
  recommendation: 'ADVANCE' | 'REJECT' | 'HOLD',
  feedbackNotes: string,
  interviewerName: string = "Admin"
) {
  try {
    if (!ratings || ratings.length === 0) {
      return { error: "Please rate at least one question." };
    }

    // Clear previous evaluations for this round if re-evaluating
    await prisma.candidateEvaluation.deleteMany({
      where: { candidateId, roundNumber }
    });

    // Save individual question ratings (1 to 5)
    for (const r of ratings) {
      await prisma.candidateEvaluation.create({
        data: {
          candidateId,
          roundNumber,
          questionId: r.questionId,
          rating: Math.min(5, Math.max(1, r.rating)),
          notes: r.notes || ""
        }
      });
    }

    // Compute average score for this round
    const totalScore = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = parseFloat((totalScore / ratings.length).toFixed(1));

    // Save round summary
    await prisma.candidateRoundSummary.deleteMany({
      where: { candidateId, roundNumber }
    });

    await prisma.candidateRoundSummary.create({
      data: {
        candidateId,
        roundNumber,
        interviewerName,
        averageRating: avgRating,
        recommendation,
        feedbackNotes
      }
    });

    // Update candidate progress status
    let nextStatus = "NEW";
    if (recommendation === 'HOLD') {
      nextStatus = 'ON_HOLD';
    } else if (recommendation === 'REJECT') {
      nextStatus = 'REJECTED';
    } else {
      if (roundNumber === 1) {
        nextStatus = 'ROUND_1_PASSED';
      } else if (roundNumber === 2) {
        nextStatus = 'ROUND_2_PASSED';
      } else if (roundNumber === 3) {
        nextStatus = 'ROUND_3_PENDING';
      }
    }

    // Recalculate candidate overall average rating across all rounds
    const allSummaries = await prisma.candidateRoundSummary.findMany({
      where: { candidateId }
    });
    const overallAvg = allSummaries.length > 0 
      ? parseFloat((allSummaries.reduce((acc, s) => acc + s.averageRating, 0) / allSummaries.length).toFixed(1))
      : avgRating;

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: nextStatus,
        overallRating: overallAvg
      }
    });

    revalidatePath("/hiring");
    return { success: true, overallRating: overallAvg, nextStatus };
  } catch (error: any) {
    console.error("Error submitting evaluation:", error);
    return { error: error.message || "Failed to submit evaluation" };
  }
}

// Admin records Final Conclusion & Hired/Rejected/On-Hold Decision
export async function finalizeCandidateDecision(
  candidateId: string,
  status: 'HIRED' | 'REJECTED' | 'ON_HOLD',
  finalConclusion: string,
  finalDecisionBy: string = "Admin"
) {
  try {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status,
        finalConclusion,
        finalDecisionBy
      }
    });

    revalidatePath("/hiring");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to finalize candidate decision" };
  }
}
