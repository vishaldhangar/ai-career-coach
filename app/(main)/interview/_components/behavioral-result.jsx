"use client";

import { CheckCircle2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STAR_KEYS = ["situation", "task", "action", "result"];
const STAR_COLORS = {
  situation: "bg-blue-500",
  task: "bg-purple-500",
  action: "bg-orange-500",
  result: "bg-emerald-500",
};

function scoreTone(score, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 75) return "text-emerald-500";
  if (pct >= 50) return "text-amber-500";
  return "text-red-500";
}

export default function BehavioralResult({ result, onStartNew }) {
  if (!result) return null;

  const questions = result.questions || [];
  const overallScore = Math.round(result.quizScore);

  const voiceQuestions = questions.filter((q) => q.isVoice && q.speechMetrics);
  const avgWpm =
    voiceQuestions.length
      ? Math.round(
          voiceQuestions.reduce((s, q) => s + (q.speechMetrics?.wpm || 0), 0) /
            voiceQuestions.length
        )
      : null;
  const totalFillers = voiceQuestions.reduce(
    (s, q) => s + (q.speechMetrics?.fillerCount || 0),
    0
  );

  return (
    <div className="mx-2 space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold gradient-title">
        <Trophy className="h-8 w-8 text-yellow-500" />
        Interview Complete
      </h1>

      {/* Overall score */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="text-center space-y-1">
            <div className={`text-5xl font-bold ${scoreTone(overallScore)}`}>
              {overallScore}
              <span className="text-2xl">/100</span>
            </div>
            <p className="text-sm text-muted-foreground">Average STAR Score</p>
          </div>
          <Progress value={overallScore} />

          {avgWpm !== null && (
            <div className="flex justify-center gap-8 pt-2 text-center border-t">
              <div>
                <div
                  className={`font-bold ${
                    avgWpm >= 100 && avgWpm <= 180
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }`}
                >
                  {avgWpm}
                </div>
                <div className="text-xs text-muted-foreground">Avg WPM</div>
              </div>
              <div>
                <div
                  className={`font-bold ${
                    totalFillers > 5 ? "text-amber-500" : "text-emerald-500"
                  }`}
                >
                  {totalFillers}
                </div>
                <div className="text-xs text-muted-foreground">Total fillers</div>
              </div>
              <div>
                <div className="font-bold">{voiceQuestions.length}</div>
                <div className="text-xs text-muted-foreground">
                  Voiced answers
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement tip */}
      {result.improvementTip && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Improvement Tip</p>
                <p className="text-sm text-muted-foreground">
                  {result.improvementTip}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Question Breakdown</h2>
        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">Q{i + 1}</span>
                    <Badge variant="secondary" className="text-xs">
                      {q.competency}
                    </Badge>
                    {q.isVoice && (
                      <Badge variant="outline" className="text-xs">
                        Voice
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {q.question}
                  </p>
                </div>
                <span
                  className={`text-lg font-bold shrink-0 ${scoreTone(
                    q.starScores?.total || 0
                  )}`}
                >
                  {q.starScores?.total || 0}/100
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {STAR_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-muted-foreground capitalize">
                    {key}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${STAR_COLORS[key]}`}
                      style={{
                        width: `${
                          ((q.starScores?.[key] || 0) / 25) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">
                    {q.starScores?.[key] || 0}/25
                  </span>
                </div>
              ))}

              {/* Speech metrics */}
              {q.isVoice && q.speechMetrics && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                  <span
                    className={
                      q.speechMetrics.wpm >= 100 && q.speechMetrics.wpm <= 180
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  >
                    {q.speechMetrics.wpm} WPM
                  </span>
                  <span>{q.speechMetrics.wordCount} words</span>
                  {q.speechMetrics.fillerCount > 0 && (
                    <span className="text-amber-600">
                      {q.speechMetrics.fillerCount} filler
                      {q.speechMetrics.fillerCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Feedback */}
              {q.starScores?.feedback && (
                <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
                  {q.starScores.feedback}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={onStartNew} className="w-full">
        Start New Interview
      </Button>
    </div>
  );
}
