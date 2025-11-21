"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EvaluationStats {
  totalEvaluations: number;
  systemAWins: number;
  systemBWins: number;
  ties: number;
  bothBad: number;
  averageTimeSpent: number;
  systemAAvgScores: {
    overall: string;
  };
  systemBAvgScores: {
    overall: string;
  };
  winRate: {
    systemA: string;
    systemB: string;
  };
}

export default function EvaluationStatsPage() {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/evaluation/stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    );
  }

  const dimensions = ["overall"];

  const getComparisonIcon = (scoreA: number, scoreB: number) => {
    if (scoreA > scoreB)
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (scoreA < scoreB)
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Evaluation Statistics
          </h1>
          <p className="text-muted-foreground mt-1">
            System A vs System B comparison results
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalEvaluations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System A Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">
                {stats.systemAWins}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.winRate.systemA}% win rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System B Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-500">
                {stats.systemBWins}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.winRate.systemB}% win rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {Math.floor(stats.averageTimeSpent / 60)}m{" "}
                {stats.averageTimeSpent % 60}s
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preference Distribution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Preference Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant="default" className="mb-2">
                  System A
                </Badge>
                <p className="text-3xl font-bold text-blue-500">
                  {stats.systemAWins}
                </p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">
                  System B
                </Badge>
                <p className="text-3xl font-bold text-purple-500">
                  {stats.systemBWins}
                </p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  Tie
                </Badge>
                <p className="text-3xl font-bold text-gray-500">{stats.ties}</p>
              </div>
              <div className="text-center">
                <Badge variant="destructive" className="mb-2">
                  Both Bad
                </Badge>
                <p className="text-3xl font-bold text-red-500">
                  {stats.bothBad}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Score Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Average Scores by Dimension</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dimensions.map((dimension) => {
                const scoreA = parseFloat(
                  stats.systemAAvgScores[
                    dimension as keyof typeof stats.systemAAvgScores
                  ]
                );
                const scoreB = parseFloat(
                  stats.systemBAvgScores[
                    dimension as keyof typeof stats.systemBAvgScores
                  ]
                );

                return (
                  <div key={dimension} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        Overall Rating
                      </span>
                      {getComparisonIcon(scoreA, scoreB)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-500 font-medium">
                            System A
                          </span>
                          <span className="font-bold">{scoreA.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(scoreA / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-500 font-medium">
                            System B
                          </span>
                          <span className="font-bold">{scoreB.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(scoreB / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
