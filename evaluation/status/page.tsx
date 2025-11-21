"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  FlaskConical,
  ArrowRight,
} from "lucide-react";

interface StatusData {
  systemASessions: number;
  systemBResponses: number;
  totalEvaluations: number;
  mode: "production" | "testing";
}

export default function EvaluationStatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      // Simulate status check - in production, you'd have a dedicated endpoint
      const evalResponse = await fetch("/api/evaluation");
      const evalData = await evalResponse.json();

      setStatus({
        systemASessions: evalData.data?.progress?.total || 0,
        systemBResponses: evalData.data?.isDummyData
          ? 0
          : evalData.data?.progress?.total || 0,
        totalEvaluations: evalData.data?.progress?.evaluated || 0,
        mode: evalData.data?.isDummyData ? "testing" : "production",
      });
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading status...</p>
        </div>
      </div>
    );
  }

  const isReady = status && status.systemBResponses > 0;
  const isTesting = status?.mode === "testing";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Evaluation System Status
          </h1>
          <p className="text-muted-foreground">
            Check your evaluation system readiness
          </p>
        </div>

        {/* Mode Badge */}
        <div className="flex justify-center mb-8">
          {isTesting ? (
            <Badge variant="secondary" className="text-lg px-6 py-2 gap-2">
              <FlaskConical className="w-5 h-5" />
              Testing Mode (Dummy Data)
            </Badge>
          ) : (
            <Badge variant="default" className="text-lg px-6 py-2 gap-2">
              <Database className="w-5 h-5" />
              Production Mode (Real Data)
            </Badge>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                System A Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">
                  {status?.systemASessions || 0}
                </p>
                {status && status.systemASessions > 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Available sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                System B Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">
                  {status?.systemBResponses || 0}
                </p>
                {status && status.systemBResponses > 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status?.systemBResponses === 0
                  ? "Using dummy data"
                  : "Real responses"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Evaluations Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">
                  {status?.totalEvaluations || 0}
                </p>
                <CheckCircle2
                  className={`w-8 h-8 ${
                    status && status.totalEvaluations > 0
                      ? "text-green-500"
                      : "text-gray-300"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Completed evaluations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {isTesting ? "Testing Mode Active" : "Production Ready"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTesting ? (
              <>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm">
                      You&apos;re currently in <strong>Testing Mode</strong>.
                      System B responses are duplicates of System A responses
                      with a dummy label.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This is perfect for testing the UI, but you&apos;ll need
                      real System B responses for actual evaluation.
                    </p>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="font-semibold text-sm">
                    To populate System B responses:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      Run the seed script:{" "}
                      <code className="bg-background px-2 py-1 rounded">
                        npm run seed:system-b
                      </code>
                    </li>
                    <li>
                      Replace placeholder responses with actual System B outputs
                    </li>
                    <li>Refresh this page to verify</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm">
                    System is ready for production evaluation! You have{" "}
                    {status?.systemBResponses} real System B responses loaded.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => router.push("/evaluation")}
            className="gap-2"
          >
            {isTesting ? "Test UI with Dummy Data" : "Start Evaluation"}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/evaluation/stats")}
          >
            View Statistics
          </Button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Need help?</p>
          <div className="flex gap-4 justify-center text-sm">
            <a
              href="/EVALUATION_QUICKSTART.md"
              className="text-primary hover:underline"
            >
              Quick Start Guide
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="/EVALUATION_SYSTEM.md"
              className="text-primary hover:underline"
            >
              Full Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
