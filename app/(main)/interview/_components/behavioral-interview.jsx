"use client";

import { useState } from "react";
import { Brain, ChevronRight, Loader2, Mic, Type } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  generateBehavioralQuestions,
  evaluateBehavioralAnswer,
  saveBehavioralResult,
} from "@/actions/interview";
import VoiceRecorder from "./voice-recorder";
import BehavioralResult from "./behavioral-result";

const COMPETENCY_COLORS = {
  leadership: "bg-blue-100 text-blue-700 border-blue-200",
  "problem-solving": "bg-purple-100 text-purple-700 border-purple-200",
  teamwork: "bg-green-100 text-green-700 border-green-200",
  "conflict-resolution": "bg-red-100 text-red-700 border-red-200",
  adaptability: "bg-orange-100 text-orange-700 border-orange-200",
};

const STAR_COMPONENTS = [
  { key: "situation", label: "Situation", color: "bg-blue-500" },
  { key: "task", label: "Task", color: "bg-purple-500" },
  { key: "action", label: "Action", color: "bg-orange-500" },
  { key: "result", label: "Result", color: "bg-emerald-500" },
];

function scoreTone(score, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 75) return "text-emerald-500";
  if (pct >= 50) return "text-amber-500";
  return "text-red-500";
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function BehavioralInterview() {
  const [phase, setPhase] = useState("idle");
  // "idle" | "generating" | "answering" | "evaluating" | "follow_up" | "saving" | "done"
  const [mode, setMode] = useState("text");
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpMetrics, setFollowUpMetrics] = useState(null);
  const [session, setSession] = useState([]);
  const [finalResult, setFinalResult] = useState(null);

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;

  const handleStart = async () => {
    setPhase("generating");
    try {
      const qs = await generateBehavioralQuestions();
      if (!qs?.length) throw new Error("No questions generated");
      setQuestions(qs);
      setSession([]);
      setCurrentIdx(0);
      setCurrentAnswer("");
      setCurrentMetrics(null);
      setPhase("answering");
    } catch (e) {
      toast.error(e.message || "Failed to generate questions");
      setPhase("idle");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    setPhase("evaluating");
    try {
      const result = await evaluateBehavioralAnswer({
        question: currentQuestion.question,
        answer: currentAnswer,
        competency: currentQuestion.competency,
      });
      setEvaluation(result);
      setFollowUpAnswer("");
      setFollowUpMetrics(null);
      setPhase("follow_up");
    } catch (e) {
      toast.error(e.message || "Failed to evaluate answer");
      setPhase("answering");
    }
  };

  const handleContinue = async () => {
    const questionData = {
      question: currentQuestion.question,
      competency: currentQuestion.competency,
      answer: currentAnswer,
      isVoice: mode === "voice",
      speechMetrics: currentMetrics,
      starScores: evaluation.starScores,
      clarityScore: evaluation.clarityScore,
      followUp: evaluation.followUp,
      followUpAnswer,
      followUpIsVoice: mode === "voice",
      followUpSpeechMetrics: followUpMetrics,
    };

    const newSession = [...session, questionData];
    setSession(newSession);

    if (isLastQuestion) {
      setPhase("saving");
      try {
        const overallScore =
          newSession.reduce((sum, q) => sum + (q.starScores?.total || 0), 0) /
          newSession.length;
        const result = await saveBehavioralResult({
          session: newSession,
          overallScore,
        });
        setFinalResult(result);
        setPhase("done");
      } catch (e) {
        toast.error(e.message || "Failed to save results");
        setSession(newSession.slice(0, -1));
        setPhase("follow_up");
      }
    } else {
      setCurrentIdx((i) => i + 1);
      setCurrentAnswer("");
      setCurrentMetrics(null);
      setEvaluation(null);
      setFollowUpAnswer("");
      setFollowUpMetrics(null);
      setPhase("answering");
    }
  };

  const handleRestart = () => {
    setPhase("idle");
    setQuestions([]);
    setCurrentIdx(0);
    setCurrentAnswer("");
    setCurrentMetrics(null);
    setEvaluation(null);
    setFollowUpAnswer("");
    setFollowUpMetrics(null);
    setSession([]);
    setFinalResult(null);
  };

  // ── Phase: idle ──────────────────────────────────────
  if (phase === "idle") {
    return (
      <Card className="mx-2 max-w-xl">
        <CardHeader>
          <CardTitle>Behavioral Mock Interview</CardTitle>
          <CardDescription>
            Answer 5 industry-specific questions using the STAR method. Get
            real-time scoring, AI follow-up questions, and speech feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">Answer mode</p>
            <div className="flex gap-2">
              <Button
                variant={mode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("text")}
                className="gap-2"
              >
                <Type className="h-4 w-4" /> Text
              </Button>
              <Button
                variant={mode === "voice" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("voice")}
                className="gap-2"
              >
                <Mic className="h-4 w-4" /> Voice
              </Button>
            </div>
            {mode === "voice" && (
              <p className="text-xs text-muted-foreground mt-2">
                Requires Chrome or Edge. Tracks WPM, filler words, and
                speaking time in real time.
              </p>
            )}
          </div>

          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>5 questions across leadership, teamwork, problem-solving, and more</li>
            <li>STAR method scoring (Situation · Task · Action · Result)</li>
            <li>AI follow-up question after each answer</li>
            {mode === "voice" && (
              <li>Filler word detection and speaking pace analysis</li>
            )}
          </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStart} className="w-full gap-2">
            <Brain className="h-4 w-4" /> Start Interview
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── Phase: generating / saving ───────────────────────
  if (phase === "generating" || phase === "saving") {
    return (
      <Card className="mx-2 max-w-xl flex min-h-48 items-center justify-center">
        <CardContent className="pt-6 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>
            {phase === "generating"
              ? "Generating your questions…"
              : "Saving your results…"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Phase: evaluating ────────────────────────────────
  if (phase === "evaluating") {
    return (
      <Card className="mx-2 max-w-xl flex min-h-48 items-center justify-center">
        <CardContent className="pt-6 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Evaluating your answer…</p>
        </CardContent>
      </Card>
    );
  }

  // ── Phase: done ──────────────────────────────────────
  if (phase === "done" && finalResult) {
    return <BehavioralResult result={finalResult} onStartNew={handleRestart} />;
  }

  // ── Phase: answering ─────────────────────────────────
  if (phase === "answering" && currentQuestion) {
    const wc = wordCount(currentAnswer);
    return (
      <Card className="mx-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>
              Question {currentIdx + 1} of {questions.length}
            </CardTitle>
            <Badge
              className={
                COMPETENCY_COLORS[currentQuestion.competency] ||
                "bg-muted text-foreground"
              }
            >
              {currentQuestion.competency}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium leading-relaxed">
            {currentQuestion.question}
          </p>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-medium">Tip:</span> Structure your answer —{" "}
            <span className="font-semibold">S</span>ituation →{" "}
            <span className="font-semibold">T</span>ask →{" "}
            <span className="font-semibold">A</span>ction →{" "}
            <span className="font-semibold">R</span>esult
          </div>

          {mode === "text" ? (
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Describe a specific situation where…"
              className="min-h-44"
            />
          ) : (
            <VoiceRecorder
              onTranscriptReady={(metrics) => {
                setCurrentAnswer(metrics.text);
                setCurrentMetrics(metrics);
              }}
              disabled={false}
            />
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {wc} word{wc !== 1 ? "s" : ""}{wc < 15 ? " (min 15)" : ""}
          </span>
          <Button onClick={handleSubmitAnswer} disabled={wc < 15}>
            Submit Answer <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── Phase: follow_up ─────────────────────────────────
  if (phase === "follow_up" && evaluation) {
    const { starScores, clarityScore, followUp } = evaluation;

    return (
      <div className="mx-2 grid gap-6 lg:grid-cols-2">
        {/* Left: STAR score + speech metrics */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>STAR Score</CardTitle>
                <span
                  className={`text-3xl font-bold ${scoreTone(starScores.total)}`}
                >
                  {starScores.total}/100
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {STAR_COMPONENTS.map(({ key, label, color }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span className={scoreTone(starScores[key], 25)}>
                        {starScores[key]}/25
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${color}`}
                        style={{
                          width: `${(starScores[key] / 25) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span className={scoreTone(clarityScore)}>
                    {clarityScore}/100
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${clarityScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {starScores.feedback}
              </div>
            </CardContent>
          </Card>

          {/* Speech metrics card — voice only */}
          {currentMetrics && mode === "voice" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Speech Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div
                      className={`text-xl font-bold ${
                        currentMetrics.wpm >= 100 &&
                        currentMetrics.wpm <= 180
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }`}
                    >
                      {currentMetrics.wpm}
                    </div>
                    <div className="text-xs text-muted-foreground">WPM</div>
                  </div>
                  <div>
                    <div
                      className={`text-xl font-bold ${
                        currentMetrics.fillerCount > 3
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {currentMetrics.fillerCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Fillers</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {currentMetrics.wordCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Words</div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-xs ${
                    currentMetrics.wpm >= 100 && currentMetrics.wpm <= 180
                      ? "border-emerald-400 text-emerald-600"
                      : "border-amber-400 text-amber-600"
                  }`}
                >
                  {currentMetrics.wpm < 100
                    ? "Speak faster — aim for 120–160 WPM"
                    : currentMetrics.wpm > 180
                    ? "Slow down — aim for 120–160 WPM"
                    : "Good speaking pace (120–180 WPM)"}
                </Badge>

                {currentMetrics.fillerWords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {currentMetrics.fillerWords.map((f) => (
                      <Badge
                        key={f.word}
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-300"
                      >
                        &ldquo;{f.word}&rdquo; ×{f.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: follow-up answer */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Follow-up Question</CardTitle>
              <CardDescription>
                Based on your answer — keep it concise (1–2 minutes).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{followUp}</p>

              {mode === "text" ? (
                <Textarea
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="Your answer…"
                  className="min-h-32"
                />
              ) : (
                <VoiceRecorder
                  onTranscriptReady={(metrics) => {
                    setFollowUpAnswer(metrics.text);
                    setFollowUpMetrics(metrics);
                  }}
                  disabled={false}
                />
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch">
              <Button
                onClick={handleContinue}
                disabled={!followUpAnswer.trim()}
                className="w-full gap-2"
              >
                {isLastQuestion ? "Finish Interview" : "Next Question"}
                <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Question {currentIdx + 1} of {questions.length}
                {!isLastQuestion
                  ? ` — ${questions.length - currentIdx - 1} more to go`
                  : " — final question"}
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
