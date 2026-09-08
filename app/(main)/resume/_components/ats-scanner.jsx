"use client";

import { useState, useEffect } from "react";
import { FileSearch, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { scanResume, scanUploadedResume, getAtsScans } from "@/actions/resume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const scoreLabels = [
  ["Keyword match", "keywordScore"],
  ["Structure", "structureScore"],
  ["Experience", "experienceScore"],
  ["Skills", "skillsScore"],
  ["Formatting", "formattingScore"],
];

function scoreTone(score) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export default function AtsScanner({ resumeContent }) {
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [scan, setScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    getAtsScans()
      .then(setScanHistory)
      .catch(() => {});
  }, []);

  const runScan = async () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 40) {
      toast.error("Add a job description with at least 40 characters");
      return;
    }
    if (!selectedFile && !resumeContent?.trim()) {
      toast.error("Upload a resume or save your resume before scanning");
      return;
    }

    setIsScanning(true);
    try {
      let result;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("jobDescription", jobDescription);
        result = await scanUploadedResume(formData);
      } else {
        result = await scanResume({ resumeContent, jobDescription });
      }
      setScan(result);
      getAtsScans()
        .then(setScanHistory)
        .catch(() => {});
      toast.success("ATS scan completed");
    } catch (error) {
      toast.error(error.message || "ATS scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  // Oldest → newest for the chart (getAtsScans returns newest first)
  const chartData = [...scanHistory].reverse().map((s) => ({
    label: format(new Date(s.createdAt), "MMM d"),
    score: Math.round(s.score),
  }));

  const hasCategorizedKeywords =
    scan?.missingRequired?.length > 0 || scan?.missingPreferred?.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle>ATS Resume Scanner</CardTitle>
          <CardDescription>
            Upload a resume or scan your saved resume against a specific job
            description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors hover:bg-muted/50">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Upload resume</span>
              <span className="block truncate text-xs text-muted-foreground">
                {selectedFile?.name || "PDF, DOCX, TXT, or Markdown"}
              </span>
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="sr-only"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
          </label>

          <div className="space-y-2">
            <label htmlFor="job-description" className="text-sm font-medium">
              Job description
            </label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the complete job description here..."
              className="min-h-64"
            />
            <p className="text-xs text-muted-foreground">
              {jobDescription.length} characters. Include responsibilities and
              required skills for better matching.
            </p>
          </div>

          <Button onClick={runScan} disabled={isScanning} className="w-full">
            {isScanning ? (
              <>
                <Loader2 className="animate-spin" /> Scanning resume...
              </>
            ) : (
              <>
                <FileSearch /> Check ATS score
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {scan ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>ATS score</CardTitle>
                <CardDescription>
                  Based on this resume and job description.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className={`text-6xl font-bold ${scoreTone(scan.score)}`}>
                  {Math.round(scan.score)}
                  <span className="text-2xl">/100</span>
                </div>
                <div className="space-y-3">
                  {scoreLabels.map(([label, key]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span>{Math.round(scan[key])}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${scan[key]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {chartData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Score history</CardTitle>
                  <CardDescription>
                    Your last {chartData.length} scans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        width={28}
                      />
                      <Tooltip
                        formatter={(v) => [`${v}/100`, "Score"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        stroke="hsl(var(--primary))"
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Keyword coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-emerald-600">
                    Matched ({scan.matchedKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scan.matchedKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {hasCategorizedKeywords ? (
                  <>
                    {scan.missingRequired?.length > 0 && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-red-500">
                          Required — missing ({scan.missingRequired.length})
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Add these to your Skills or Experience section
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {scan.missingRequired.map((keyword) => (
                            <Badge key={keyword} variant="destructive">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {scan.missingPreferred?.length > 0 && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-amber-500">
                          Preferred — missing ({scan.missingPreferred.length})
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Nice-to-have skills that could strengthen your
                          application
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {scan.missingPreferred.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="outline"
                              className="border-amber-400 text-amber-600"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  scan.missingKeywords?.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Missing ({scan.missingKeywords.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {scan.missingKeywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scan.suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.category}-${index}`}
                    className="rounded-md border p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {suggestion.category}
                      </p>
                      <Badge
                        variant={
                          suggestion.priority === "high"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.message}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex min-h-64 items-center justify-center">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileSearch className="mx-auto mb-3 h-10 w-10" />
              <p>Your ATS report will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
