"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuizResult from "./quiz-result";
import BehavioralResult from "./behavioral-result";

export default function QuizList({ assessments }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  const technical = assessments?.filter((a) => a.category !== "Behavioral") ?? [];
  const behavioral = assessments?.filter((a) => a.category === "Behavioral") ?? [];

  return (
    <>
      {/* Technical quizzes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="gradient-title text-3xl md:text-4xl">
                Recent Quizzes
              </CardTitle>
              <CardDescription>
                Review your past quiz performance
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/interview/mock")}>
              Start New Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {technical.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No quizzes yet. Start your first quiz!
            </p>
          ) : (
            <div className="space-y-4">
              {technical.map((assessment, i) => (
                <Card
                  key={assessment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelected(assessment)}
                >
                  <CardHeader>
                    <CardTitle className="gradient-title text-2xl">
                      Quiz {i + 1}
                    </CardTitle>
                    <CardDescription className="flex justify-between w-full flex-wrap gap-1">
                      <span>Score: {assessment.quizScore.toFixed(1)}%</span>
                      <span>
                        {format(
                          new Date(assessment.createdAt),
                          "MMMM dd, yyyy HH:mm"
                        )}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  {assessment.improvementTip && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {assessment.improvementTip}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral interviews */}
      {behavioral.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="gradient-title text-3xl md:text-4xl">
                  Behavioral Interviews
                </CardTitle>
                <CardDescription>
                  Review your STAR method performance
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/interview/behavioral")}
              >
                New Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {behavioral.map((assessment, i) => (
                <Card
                  key={assessment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelected(assessment)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="gradient-title text-2xl">
                        Interview {i + 1}
                      </CardTitle>
                      <Badge variant="secondary">Behavioral</Badge>
                    </div>
                    <CardDescription className="flex justify-between w-full flex-wrap gap-1">
                      <span>Score: {assessment.quizScore.toFixed(1)}/100</span>
                      <span>
                        {format(
                          new Date(assessment.createdAt),
                          "MMMM dd, yyyy HH:mm"
                        )}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  {assessment.improvementTip && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {assessment.improvementTip}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle />
          </DialogHeader>
          {selected?.category === "Behavioral" ? (
            <BehavioralResult
              result={selected}
              onStartNew={() => {
                setSelected(null);
                router.push("/interview/behavioral");
              }}
            />
          ) : (
            <QuizResult
              result={selected}
              hideStartNew
              onStartNew={() => router.push("/interview/mock")}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
