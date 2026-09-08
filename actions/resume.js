"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

// === ATS Analysis Helpers ===

const ATS_STOP_WORDS = new Set([
  "and", "the", "with", "for", "from", "this", "that", "are", "you",
  "your", "our", "will", "have", "has", "about", "into", "their",
  "work", "team", "able", "also", "must", "would", "should", "may",
  "can", "not", "but", "its", "all", "any", "new", "use", "used",
  "role", "they", "them", "who", "what", "when", "where", "how",
  "very", "well", "good", "both", "each", "more", "such", "than",
  "then", "some", "these", "those", "been", "being", "other",
]);

// Canonical → list of aliases (all lowercase)
const SKILL_ALIASES = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  "node.js": ["nodejs", "node"],
  "react.js": ["reactjs", "react"],
  "next.js": ["nextjs"],
  "vue.js": ["vuejs", "vue"],
  "angular.js": ["angularjs", "angular"],
  postgresql: ["postgres", "psql", "pg"],
  mongodb: ["mongo"],
  kubernetes: ["k8s"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp", "google cloud"],
  "microsoft azure": ["azure"],
  "continuous integration": ["ci"],
  "continuous deployment": ["cd"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "natural language processing": ["nlp"],
  "deep learning": ["dl"],
  "user experience": ["ux"],
  "user interface": ["ui"],
};

// Build reverse map: alias → canonical
const ALIAS_LOOKUP = (() => {
  const map = new Map();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    map.set(canonical, canonical);
    for (const alias of aliases) map.set(alias.toLowerCase(), canonical);
  }
  return map;
})();

function normalizeSkill(skill) {
  const lower = skill.toLowerCase().trim();
  return ALIAS_LOOKUP.get(lower) ?? lower;
}

// Multi-word phrases matched first (prevents "machine" and "learning" being split)
const MULTI_WORD_PHRASES = [
  "machine learning", "deep learning", "natural language processing", "computer vision",
  "data science", "data engineering", "data analysis", "data analytics",
  "artificial intelligence", "generative ai",
  "react native", "node.js", "next.js", "vue.js", "angular.js",
  "amazon web services", "google cloud platform", "microsoft azure",
  "continuous integration", "continuous deployment", "continuous delivery",
  "project management", "product management", "agile methodology",
  "scrum master", "software architecture", "system design",
  "object oriented programming", "test driven development",
  "restful api", "rest api", "graphql api",
  "full stack", "front end", "back end",
  "user experience", "user interface",
  "version control", "code review", "unit testing", "integration testing",
  "cloud computing", "linux administration",
];

// Known short acronyms (≥2 chars) to keep; everything else requires ≥3 chars
const TECH_ACRONYMS = new Set([
  "sql", "aws", "api", "gcp", "css", "html", "xml", "git", "ci", "cd",
  "ui", "ux", "ml", "ai", "nlp", "dl", "ios", "sdk", "ide", "orm",
  "cli", "jwt", "spa", "oop", "tdd", "bdd", "etl", "bi",
  "s3", "ec2", "rds", "vpc", "dns", "cdn", "ssl", "tls",
  "http", "rest", "grpc", "js", "ts", "vm", "os", "db",
]);

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  // Match multi-word phrases first so they are not split into tokens
  for (const phrase of MULTI_WORD_PHRASES) {
    if (lower.includes(phrase)) found.add(normalizeSkill(phrase));
  }

  // Extract individual tokens
  const tokens = lower.match(/[a-z][a-z0-9+#.-]*/g) || [];
  for (const token of tokens) {
    if (ATS_STOP_WORDS.has(token)) continue;
    if (token.length < 2) continue;
    if (token.length === 2 && !TECH_ACRONYMS.has(token)) continue;
    found.add(normalizeSkill(token));
  }

  return [...found];
}

function calculateKeywordMatch(resumeContent, jobDescription, parsedJD) {
  const resumeSet = new Set(extractKeywords(resumeContent));

  // Use structured JD keywords when available
  if (parsedJD && parsedJD.required.length + parsedJD.preferred.length > 0) {
    const requiredKw = [
      ...new Set(parsedJD.required.flatMap((item) => extractKeywords(item))),
    ];
    const preferredKw = [
      ...new Set(
        parsedJD.preferred
          .flatMap((item) => extractKeywords(item))
          .filter((k) => !requiredKw.includes(k))
      ),
    ];

    const matchedRequired = requiredKw.filter((k) => resumeSet.has(k));
    const missingRequired = requiredKw.filter((k) => !resumeSet.has(k));
    const matchedPreferred = preferredKw.filter((k) => resumeSet.has(k));
    const missingPreferred = preferredKw.filter((k) => !resumeSet.has(k));

    // Required keywords count double in the weighted score
    const totalW = requiredKw.length * 2 + preferredKw.length;
    const matchedW = matchedRequired.length * 2 + matchedPreferred.length;

    return {
      score: totalW > 0 ? Math.round((matchedW / totalW) * 100) : 0,
      matchedKeywords: [...matchedRequired, ...matchedPreferred].slice(0, 40),
      missingKeywords: [...missingRequired, ...missingPreferred].slice(0, 40),
      missingRequired: missingRequired.slice(0, 20),
      missingPreferred: missingPreferred.slice(0, 20),
    };
  }

  // Fallback: unstructured keyword comparison
  const jobKeywords = extractKeywords(jobDescription);
  const matched = jobKeywords.filter((k) => resumeSet.has(k));
  const missing = jobKeywords.filter((k) => !resumeSet.has(k));

  return {
    score: jobKeywords.length
      ? Math.round((matched.length / jobKeywords.length) * 100)
      : 0,
    matchedKeywords: matched.slice(0, 40),
    missingKeywords: missing.slice(0, 40),
    missingRequired: missing.slice(0, 20),
    missingPreferred: [],
  };
}

function calculateStructureScore(content) {
  const sectionPatterns = {
    summary:
      /^#{1,3}\s*(summary|profile|objective|about|professional\s+summary)/im,
    skills:
      /^#{1,3}\s*(skills|technical\s+skills|core\s+competencies|technologies|expertise)/im,
    experience:
      /^#{1,3}\s*(experience|work\s+experience|professional\s+experience|employment)/im,
    education:
      /^#{1,3}\s*(education|academic|qualifications|degree)/im,
    projects:
      /^#{1,3}\s*(projects?|portfolio|work\s+samples?|personal\s+projects?)/im,
  };
  const found = Object.values(sectionPatterns).filter((p) => p.test(content));
  return Math.round((found.length / Object.keys(sectionPatterns).length) * 100);
}

function parseModelJson(text) {
  const cleanedText = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleanedText);
}

// Gemini call 1: parse the JD into structured required/preferred lists
async function parseJobDescription(jobDescription) {
  const prompt = `
Parse this job description and extract requirements. Return ONLY valid JSON with this exact shape:
{
  "required": ["specific skill, tool, or qualification"],
  "preferred": ["nice-to-have skill"],
  "responsibilities": ["key responsibility"]
}

Rules:
- "required": labeled as required, must have, essential, minimum, or necessary in the JD
- "preferred": labeled as preferred, nice to have, bonus, a plus, desired, or advantageous
- If the JD does not distinguish, classify as "required"
- Extract specific technologies, frameworks, tools, certifications, and methodologies
- Keep each item concise (1-5 words), no full sentences
- Include both hard skills (React, Python) and soft skills (communication, leadership)

Job Description:
${jobDescription}
`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = parseModelJson(result.response.text());
    return {
      required: Array.isArray(parsed.required) ? parsed.required : [],
      preferred: Array.isArray(parsed.preferred) ? parsed.preferred : [],
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities
        : [],
    };
  } catch {
    // Fallback: return empty structure so keyword matching uses raw JD text
    return { required: [], preferred: [], responsibilities: [] };
  }
}

// Gemini call 2: score the resume against the JD
async function createAtsScan({ resume, resumeContent, jobDescription }) {
  const structureScore = calculateStructureScore(resumeContent);
  const parsedJD = await parseJobDescription(jobDescription);
  const keywordAnalysis = calculateKeywordMatch(resumeContent, jobDescription, parsedJD);

  const prompt = `
Analyze this resume against the job description.

Structured job requirements:
Required skills: ${parsedJD.required.join(", ") || "See job description"}
Preferred skills: ${parsedJD.preferred.join(", ") || "None specified"}
Key responsibilities: ${parsedJD.responsibilities.join("; ") || "See job description"}

Return only valid JSON with this exact shape:
{
  "experienceScore": number,
  "skillsScore": number,
  "formattingScore": number,
  "suggestions": [
    { "category": "string", "priority": "high" | "medium" | "low", "message": "string" }
  ]
}

Scoring guidelines (0-100):
- experienceScore: How well the resume's experience matches the listed responsibilities
- skillsScore: Percentage of required skills clearly present in the resume
- formattingScore: ATS-safe formatting — penalise tables, columns, images, special symbols; reward clear markdown headers and standard sections
- suggestions: 3-5 specific, actionable improvements referencing actual missing requirements

Do not invent experience. Focus on measurable impact and concrete gaps.

Resume:
${resumeContent}

Job description:
${jobDescription}
`;

  try {
    const result = await model.generateContent(prompt);
    const analysis = parseModelJson(result.response.text());
    const experienceScore = Math.min(
      100,
      Math.max(0, Number(analysis.experienceScore) || 0)
    );
    const skillsScore = Math.min(
      100,
      Math.max(0, Number(analysis.skillsScore) || 0)
    );
    const formattingScore = Math.min(
      100,
      Math.max(0, Number(analysis.formattingScore) || 0)
    );

    const score = Math.round(
      keywordAnalysis.score * 0.35 +
        structureScore * 0.15 +
        experienceScore * 0.2 +
        skillsScore * 0.2 +
        formattingScore * 0.1
    );
    const suggestions = Array.isArray(analysis.suggestions)
      ? analysis.suggestions
      : [];

    const scan = await db.atsScan.create({
      data: {
        resumeId: resume.id,
        resumeContent: resumeContent.trim(),
        jobDescription: jobDescription.trim(),
        score,
        keywordScore: keywordAnalysis.score,
        structureScore,
        experienceScore,
        skillsScore,
        formattingScore,
        matchedKeywords: keywordAnalysis.matchedKeywords,
        missingKeywords: keywordAnalysis.missingKeywords,
        missingRequired: keywordAnalysis.missingRequired,
        missingPreferred: keywordAnalysis.missingPreferred,
        suggestions,
      },
    });

    await db.resume.update({
      where: { id: resume.id },
      data: {
        atsScore: score,
        feedback: JSON.stringify(suggestions),
      },
    });

    return scan;
  } catch (error) {
    console.error("Error scanning resume:", error);
    throw new Error("Failed to scan resume");
  }
}

async function extractResumeText(file) {
  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer));
    return Array.isArray(text) ? text.join("\n") : text;
  }

  if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    file.type.startsWith("text/")
  ) {
    return buffer.toString("utf8");
  }

  throw new Error("Upload a PDF, DOCX, TXT, or Markdown resume");
}

export async function scanResume({ resumeContent, jobDescription }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!resumeContent?.trim()) throw new Error("Add resume content before scanning");
  if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
    throw new Error("Add a job description with at least 40 characters");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { resume: true },
  });

  if (!user?.resume) throw new Error("Save your resume before scanning it");

  return createAtsScan({
    resume: user.resume,
    resumeContent,
    jobDescription,
  });
}

export async function scanUploadedResume(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const file = formData.get("file");
  const jobDescription = formData.get("jobDescription");

  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Select a resume file to upload");
  }
  if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
    throw new Error("Add a job description with at least 40 characters");
  }

  try {
    const resumeContent = await extractResumeText(file);
    if (!resumeContent.trim()) throw new Error("Could not extract text from this file");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { resume: true },
    });
    if (!user) throw new Error("User not found");

    const resume =
      user.resume ||
      (await db.resume.create({
        data: { userId: user.id, content: resumeContent },
      }));

    return createAtsScan({
      resume,
      resumeContent,
      jobDescription,
    });
  } catch (error) {
    console.error("Error scanning uploaded resume:", error);
    throw new Error(error.message || "Failed to scan uploaded resume");
  }
}

export async function getAtsScans() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { resume: true },
  });

  if (!user?.resume) return [];

  return db.atsScan.findMany({
    where: { resumeId: user.resume.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords

    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error);
    throw new Error("Failed to improve content");
  }
}
