"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);

      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function generateBehavioralQuestions() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
Generate 5 behavioral interview questions for a ${user.industry} professional.

Format: "Tell me about a time..." or "Describe a situation when..."
Cover these 5 competencies in this order: leadership, problem-solving, teamwork, conflict-resolution, adaptability.
Make each question relevant to ${user.industry}${user.skills?.length ? ` with skills like ${user.skills.slice(0, 3).join(", ")}` : ""}.

Return ONLY valid JSON:
{
  "questions": [
    { "question": "string", "competency": "leadership" }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    const data = JSON.parse(text);
    return Array.isArray(data.questions) ? data.questions : [];
  } catch (error) {
    console.error("Error generating behavioral questions:", error);
    throw new Error("Failed to generate behavioral questions");
  }
}

export async function evaluateBehavioralAnswer({ question, answer, competency }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!answer?.trim() || answer.trim().split(/\s+/).length < 15) {
    throw new Error("Please provide a more detailed answer (at least 15 words)");
  }

  const prompt = `
Evaluate this behavioral interview answer using the STAR method.

Competency: ${competency}
Question: "${question}"
Answer: "${answer}"

Score each STAR component out of 25:
- Situation (25): Clear context and background provided
- Task (25): Candidate's specific role/responsibility explained
- Action (25): Concrete personal steps taken, first-person ownership
- Result (25): Quantifiable or specific outcome described

Clarity score (0-100): how well-structured, concise, and easy-to-follow the answer is.

Generate ONE specific follow-up question targeting the weakest part of their answer.

Return ONLY valid JSON:
{
  "starScores": {
    "situation": number,
    "task": number,
    "action": number,
    "result": number,
    "total": number,
    "feedback": "2-3 sentence feedback — what was strong and what was missing"
  },
  "clarityScore": number,
  "followUp": "specific follow-up question"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(text);
    const s = parsed.starScores || {};
    return {
      starScores: {
        situation: Math.min(25, Math.max(0, Number(s.situation) || 0)),
        task: Math.min(25, Math.max(0, Number(s.task) || 0)),
        action: Math.min(25, Math.max(0, Number(s.action) || 0)),
        result: Math.min(25, Math.max(0, Number(s.result) || 0)),
        total: Math.min(100, Math.max(0, Number(s.total) || 0)),
        feedback: s.feedback || "",
      },
      clarityScore: Math.min(100, Math.max(0, Number(parsed.clarityScore) || 0)),
      followUp: parsed.followUp || "Can you tell me more about the outcome?",
    };
  } catch (error) {
    console.error("Error evaluating behavioral answer:", error);
    throw new Error("Failed to evaluate your answer. Please try again.");
  }
}

export async function saveBehavioralResult({ session, overallScore }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  let improvementTip = null;
  try {
    const starKeys = ["situation", "task", "action", "result"];
    const avgByComponent = starKeys.map((k) => ({
      component: k,
      avg: session.reduce((sum, q) => sum + (q.starScores?.[k] || 0), 0) / session.length,
    }));
    const weakest = [...avgByComponent].sort((a, b) => a.avg - b.avg)[0];

    const tipPrompt = `
A ${user.industry} candidate scored ${Math.round(overallScore)}/100 in a behavioral mock interview.
Weakest STAR component: "${weakest.component}" (avg ${weakest.avg.toFixed(1)}/25 across all answers).

Give one focused, actionable tip in 2 sentences to improve their "${weakest.component}" component in STAR answers.
Be specific and encouraging. Give a concrete example of what a strong ${weakest.component} looks like.
`;
    const tipResult = await model.generateContent(tipPrompt);
    improvementTip = tipResult.response.text().trim();
  } catch {
    // Continue without tip
  }

  return db.assessment.create({
    data: {
      userId: user.id,
      quizScore: overallScore,
      questions: session,
      category: "Behavioral",
      improvementTip,
    },
  });
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
