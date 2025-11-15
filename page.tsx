"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ResponseCard } from "@/components/evaluation/ResponseCard";
import { UserMessageDisplay } from "@/components/evaluation/UserMessageDisplay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface EvaluationData {
  sessionId: string;
  messageIndex: number;
  userMessage: {
    content: string;
    codeContent?: string;
    codeLanguage?: string;
  };
  leftSystem: "A" | "B";
  rightSystem: "A" | "B";
  leftResponse: string;
  rightResponse: string;
  progress: {
    evaluated: number;
    total: number;
  };
  isDummyData?: boolean; // Flag for dummy data mode
}

interface Scores {
  overall: number;
}

const defaultScores: Scores = {
  overall: 0,
};

export default function EvaluationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [leftScores, setLeftScores] = useState<Scores>(defaultScores);
  const [rightScores, setRightScores] = useState<Scores>(defaultScores);
  const [comments, setComments] = useState("");
  const [leftFlagged, setLeftFlagged] = useState(false);
  const [rightFlagged, setRightFlagged] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Fetch next evaluation pair
  const fetchNextPair = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/evaluation");
      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Failed to fetch evaluation data");
        return;
      }

      if (!result.data) {
        setCompleted(true);
        toast.success(
          result.message || "All evaluations completed! Great work! 🎉"
        );
        return;
      }

      setEvaluationData(result.data);
      // Reset form
      setLeftScores(defaultScores);
      setRightScores(defaultScores);
      setComments("");
      setLeftFlagged(false);
      setRightFlagged(false);
      setStartTime(Date.now());
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      toast.error("Failed to load evaluation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchNextPair();
    }
  }, [status, router, fetchNextPair]);

  const validateScores = (scores: Scores): boolean => {
    return Object.values(scores).every((score) => score >= 1 && score <= 5);
  };

  const handleSubmit = async () => {
    if (!evaluationData) return;

    // Validation
    if (!validateScores(leftScores) || !validateScores(rightScores)) {
      toast.error("Please provide overall rating (1-5) for both responses");
      return;
    }

    // Auto-determine preference based on scores
    const preference = leftScores.overall > rightScores.overall 
      ? evaluationData.leftSystem 
      : leftScores.overall < rightScores.overall 
      ? evaluationData.rightSystem 
      : "tie";

    try {
      setSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      const flaggedIssues = [];
      if (leftFlagged)
        flaggedIssues.push(`${evaluationData.leftSystem} response flagged`);
      if (rightFlagged)
        flaggedIssues.push(`${evaluationData.rightSystem} response flagged`);

      const response = await fetch("/api/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: evaluationData.sessionId,
          messageIndex: evaluationData.messageIndex,
          leftSystem: evaluationData.leftSystem,
          rightSystem: evaluationData.rightSystem,
          leftScores,
          rightScores,
          preference,
          comments: comments.trim() || undefined,
          flaggedIssues: flaggedIssues.length > 0 ? flaggedIssues : undefined,
          timeSpent,
          skipped: false,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Failed to submit evaluation");
        return;
      }

      toast.success("Evaluation submitted successfully!");
      // Fetch next pair
      await fetchNextPair();
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      toast.error("Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!evaluationData) return;

    try {
      setSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      await fetch("/api/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: evaluationData.sessionId,
          messageIndex: evaluationData.messageIndex,
          leftSystem: evaluationData.leftSystem,
          rightSystem: evaluationData.rightSystem,
          leftScores: defaultScores,
          rightScores: defaultScores,
          preference: "tie",
          comments: "Skipped",
          timeSpent,
          skipped: true,
        }),
      });

      toast.info("Skipped to next evaluation");
      await fetchNextPair();
    } catch (error) {
      console.error("Error skipping:", error);
      toast.error("Failed to skip");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">All Done!</h2>
            <p className="text-muted-foreground">
              You've completed all available evaluations. Thank you for your
              contribution!
            </p>
            {evaluationData?.progress && (
              <p className="text-sm font-medium">
                Total Evaluated: {evaluationData.progress.evaluated} /{" "}
                {evaluationData.progress.total}
              </p>
            )}
            <Button onClick={() => router.push("/chat")} className="mt-4">
              Go to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500" />
            <h2 className="text-2xl font-bold">No Data Available</h2>
            <p className="text-muted-foreground">
              There are no evaluation pairs available at the moment.
            </p>
            <Button onClick={() => router.push("/chat")} className="mt-4">
              Go to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage =
    (evaluationData.progress.evaluated / evaluationData.progress.total) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Response Evaluation
              </h1>
              <p className="text-muted-foreground mt-1">
                Compare and rate AI responses side-by-side
              </p>
              {evaluationData?.isDummyData && (
                <Badge variant="secondary" className="mt-2">
                  🧪 Testing Mode - Using Dummy Data
                </Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">
                {evaluationData.progress.evaluated} /{" "}
                {evaluationData.progress.total}
              </p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* User Message */}
        <div className="mb-8">
          {evaluationData.isDummyData && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Testing Mode:</strong> System B responses are dummy data (duplicates of System A). 
                Run <code className="px-1 py-0.5 bg-yellow-500/20 rounded">npm run seed:system-b</code> to populate real System B responses.
              </p>
            </div>
          )}
          <UserMessageDisplay
            content={evaluationData.userMessage.content}
            codeContent={evaluationData.userMessage.codeContent}
            codeLanguage={evaluationData.userMessage.codeLanguage}
          />
        </div>

        {/* Response Comparison */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ResponseCard
            title={`Response ${evaluationData.leftSystem}`}
            content={evaluationData.leftResponse}
            scores={leftScores}
            onScoreChange={(dimension, value) =>
              setLeftScores((prev) => ({ ...prev, [dimension]: value }))
            }
            onFlag={() => setLeftFlagged(!leftFlagged)}
            isFlagged={leftFlagged}
            className="border-l-4 border-l-blue-500"
          />
          <ResponseCard
            title={`Response ${evaluationData.rightSystem}`}
            content={evaluationData.rightResponse}
            scores={rightScores}
            onScoreChange={(dimension, value) =>
              setRightScores((prev) => ({ ...prev, [dimension]: value }))
            }
            onFlag={() => setRightFlagged(!rightFlagged)}
            isFlagged={rightFlagged}
            className="border-l-4 border-l-purple-500"
          />
        </div>

       

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={submitting}
            className="gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="gap-2 min-w-[200px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit & Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}