"use client";

import React, { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BriefcaseIcon,
  TrendingUp,
  TrendingDown,
  LineChart,
  Brain,
  RefreshCw,
  Sparkles,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { refreshInsights } from "@/actions/dashboard";

// ── helpers ───────────────────────────────────────────────────────────────────

function getOutlookInfo(outlook = "") {
  switch (outlook.toLowerCase()) {
    case "positive":
      return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" };
    case "negative":
      return { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" };
    default:
      return { icon: LineChart, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" };
  }
}

function getDemandStyle(level = "") {
  switch (level.toLowerCase()) {
    case "high":   return { bar: "bg-emerald-500", text: "text-emerald-600" };
    case "low":    return { bar: "bg-red-500",      text: "text-red-600"    };
    default:       return { bar: "bg-amber-400",    text: "text-amber-600"  };
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function DashboardView({ insights: initial }) {
  const [insights, setInsights] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const fresh = await refreshInsights();
        setInsights(fresh);
        toast.success("Industry insights refreshed");
      } catch (e) {
        toast.error(e.message || "Failed to refresh insights");
      }
    });
  };

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center">
        <p className="text-muted-foreground">No industry insights available yet.</p>
        <Button onClick={handleRefresh} disabled={isPending} className="gap-2">
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Insights
        </Button>
      </div>
    );
  }

  const isEmpty = !insights.salaryRanges?.length;

  const salaryData = (insights.salaryRanges ?? []).map((r) => ({
    name: r.role,
    Min: Math.round(r.min / 1000),
    Median: Math.round(r.median / 1000),
    Max: Math.round(r.max / 1000),
  }));

  const outlookInfo = getOutlookInfo(insights.marketOutlook);
  const OutlookIcon = outlookInfo.icon;
  const demandStyle = getDemandStyle(insights.demandLevel);
  const lastUpdated = format(new Date(insights.lastUpdated), "dd MMM yyyy");
  const nextUpdate = formatDistanceToNow(new Date(insights.nextUpdate), {
    addSuffix: true,
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Updated {lastUpdated}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Next refresh {nextUpdate}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Refreshing…" : "Refresh Insights"}
        </Button>
      </div>

      {/* ── Empty-state banner ─────────────────────────────────────────── */}
      {isEmpty && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Insights are still being generated.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Click <strong>Refresh Insights</strong> above to load them now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Market Outlook */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Outlook</CardTitle>
            <div className={`rounded-md p-1.5 ${outlookInfo.bg}`}>
              <OutlookIcon className={`h-4 w-4 ${outlookInfo.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outlookInfo.color}`}>
              {insights.marketOutlook}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Updates {nextUpdate}
            </p>
          </CardContent>
        </Card>

        {/* Industry Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Industry Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.growthRate?.toFixed(1) ?? "—"}%
            </div>
            <Progress
              value={Math.min(insights.growthRate ?? 0, 100)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Annual growth rate</p>
          </CardContent>
        </Card>

        {/* Demand Level */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talent Demand</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${demandStyle.text}`}>
              {insights.demandLevel}
            </div>
            <div className={`h-2 w-full rounded-full mt-2 ${demandStyle.bar}`} />
            <p className="text-xs text-muted-foreground mt-1">Hiring demand signal</p>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {insights.topSkills?.length ? (
              <div className="flex flex-wrap gap-1">
                {insights.topSkills.slice(0, 6).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {insights.topSkills.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{insights.topSkills.length - 6}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Salary chart ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Ranges by Role</CardTitle>
          <CardDescription>
            Min, median, and max annual salaries (in $K USD)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salaryData.length ? (
            <div style={{ height: Math.max(280, salaryData.length * 52) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salaryData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v}K`}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip
                    formatter={(value, name) => [`$${value}K`, name]}
                    contentStyle={{ fontSize: 13 }}
                  />
                  <Legend />
                  <Bar
                    dataKey="Min"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="Median"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="Max"
                    fill="#a78bfa"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground text-sm">
              Salary data will appear after insights are generated.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Trends + Recommended Skills ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Industry Trends
            </CardTitle>
            <CardDescription>
              Current forces shaping the industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.keyTrends?.length ? (
              <ol className="space-y-3">
                {insights.keyTrends.map((trend, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{trend}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No trends data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recommended Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Skills to Develop
            </CardTitle>
            <CardDescription>
              High-value skills recommended for your industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.recommendedSkills?.length ? (
              <div className="flex flex-wrap gap-2">
                {insights.recommendedSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="gap-1 py-1 text-sm"
                  >
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recommendations yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
