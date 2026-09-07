"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}

IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
Include at least 6 common roles with realistic salary ranges (numbers in USD thousands per year, e.g. 80000 for $80K).
Growth rate should be a realistic percentage (e.g. 8.5 for 8.5%).
Include at least 6 in-demand skills in topSkills.
Include at least 5 specific, actionable trends in keyTrends — describe real current shifts in the industry.
Include at least 6 high-value skills to learn in recommendedSkills.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleanedText);
};

const NEXT_UPDATE_MS = 7 * 24 * 60 * 60 * 1000;

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  const insight = user.industryInsight;

  // Regenerate when: no record exists OR placeholder has no salary data (empty onboarding artifact)
  const needsGeneration = !insight || !insight.salaryRanges?.length;

  if (needsGeneration) {
    const data = await generateAIInsights(user.industry);
    return db.industryInsight.upsert({
      where: { industry: user.industry },
      update: {
        ...data,
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + NEXT_UPDATE_MS),
      },
      create: {
        industry: user.industry,
        ...data,
        nextUpdate: new Date(Date.now() + NEXT_UPDATE_MS),
      },
    });
  }

  return insight;
}

export async function refreshInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  if (!user?.industry) throw new Error("Complete onboarding before refreshing insights");

  const data = await generateAIInsights(user.industry);

  return db.industryInsight.upsert({
    where: { industry: user.industry },
    update: {
      ...data,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + NEXT_UPDATE_MS),
    },
    create: {
      industry: user.industry,
      ...data,
      nextUpdate: new Date(Date.now() + NEXT_UPDATE_MS),
    },
  });
}
