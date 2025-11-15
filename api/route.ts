import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Session from "@/model/session-model";
import SystemBResponse from "@/model/system-b-response-model";
import Evaluation from "@/model/evaluation-model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - Fetch next evaluation pair
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const evaluatorId = session.user.email;

    // Find sessions that have both System A and System B responses
    // and haven't been evaluated by this evaluator yet

    // Get all System B responses
    const systemBResponses = await SystemBResponse.find({})
      .sort({ sessionId: 1, messageIndex: 1 })
      .lean();

    // DEVELOPMENT MODE: If no System B responses, use dummy data from System A
    const useDummyData = systemBResponses.length === 0;

    if (useDummyData) {
      console.log(
        "⚠️ No System B responses found - using dummy data for testing"
      );

      // Get sessions that haven't been evaluated yet
      const allSessions = await Session.find({
        messages: { $elemMatch: { role: "user" } },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      if (!allSessions.length) {
        return NextResponse.json({
          success: true,
          data: null,
          message: "No sessions available for dummy evaluation",
        });
      }

      // Find a session that hasn't been evaluated
      for (const sessionDoc of allSessions) {
        const existingEvaluation = await Evaluation.findOne({
          sessionId: sessionDoc.sessionId,
          messageIndex: 0,
          evaluatorId,
        });

        if (existingEvaluation) continue;

        const messages = sessionDoc.messages;
        let userMessage = null;
        let assistantMessage = null;

        for (let i = 0; i < messages.length; i++) {
          if (messages[i].role === "user" && !userMessage) {
            userMessage = messages[i];
            for (let j = i + 1; j < messages.length; j++) {
              if (messages[j].role === "assistant") {
                assistantMessage = messages[j];
                break;
              }
            }
            break;
          }
        }

        if (!userMessage || !assistantMessage) continue;

        // Create dummy System B response (slightly modified version)
        const dummySystemBResponse = `[DUMMY SYSTEM B RESPONSE FOR TESTING]

${assistantMessage.content}

Note: This is a dummy response for UI testing. The actual System B response would be different. Please populate System B responses in the database for real evaluations.`;

        const randomize = Math.random() < 0.5;
        const leftSystem = randomize ? "B" : "A";
        const rightSystem = randomize ? "A" : "B";

        const totalEvaluated = await Evaluation.countDocuments({ evaluatorId });
        const totalAvailable = allSessions.length;

        return NextResponse.json({
          success: true,
          data: {
            sessionId: sessionDoc.sessionId,
            messageIndex: 0,
            userMessage: {
              content: userMessage.content,
              codeContent: userMessage.codeContent,
              codeLanguage: userMessage.codeLanguage,
            },
            leftSystem,
            rightSystem,
            leftResponse:
              leftSystem === "A"
                ? assistantMessage.content
                : dummySystemBResponse,
            rightResponse:
              rightSystem === "A"
                ? assistantMessage.content
                : dummySystemBResponse,
            progress: {
              evaluated: totalEvaluated,
              total: totalAvailable,
            },
            isDummyData: true, // Flag for UI
          },
        });
      }

      // All sessions evaluated
      const totalEvaluated = await Evaluation.countDocuments({ evaluatorId });
      return NextResponse.json({
        success: true,
        data: null,
        message: "All dummy pairs have been evaluated",
        progress: {
          evaluated: totalEvaluated,
          total: allSessions.length,
        },
      });
    }

    // Find a pair that hasn't been evaluated by this user
    for (const systemBResp of systemBResponses) {
      // Check if already evaluated by this user
      const existingEvaluation = await Evaluation.findOne({
        sessionId: systemBResp.sessionId,
        messageIndex: systemBResp.messageIndex,
        evaluatorId,
      });

      if (existingEvaluation) {
        continue; // Skip already evaluated pairs
      }

      // Get the System A response (from session)
      const sessionDoc = await Session.findOne({
        sessionId: systemBResp.sessionId,
      }).lean();

      if (!sessionDoc || !sessionDoc.messages) {
        continue;
      }

      // Find the first user message and its assistant response
      const messages = sessionDoc.messages;
      let userMessage = null;
      let assistantMessage = null;

      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === "user" && !userMessage) {
          userMessage = messages[i];
          // Find the next assistant message
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].role === "assistant") {
              assistantMessage = messages[j];
              break;
            }
          }
          break;
        }
      }

      if (!userMessage || !assistantMessage) {
        continue;
      }

      // Randomize which system appears on which side
      const randomize = Math.random() < 0.5;
      const leftSystem = randomize ? "B" : "A";
      const rightSystem = randomize ? "A" : "B";

      // Get total evaluated count for progress
      const totalEvaluated = await Evaluation.countDocuments({ evaluatorId });
      const totalAvailable = systemBResponses.length;

      return NextResponse.json({
        success: true,
        data: {
          sessionId: systemBResp.sessionId,
          messageIndex: systemBResp.messageIndex,
          userMessage: {
            content: userMessage.content,
            codeContent: userMessage.codeContent,
            codeLanguage: userMessage.codeLanguage,
          },
          leftSystem,
          rightSystem,
          leftResponse:
            leftSystem === "A"
              ? assistantMessage.content
              : systemBResp.assistantResponse,
          rightResponse:
            rightSystem === "A"
              ? assistantMessage.content
              : systemBResp.assistantResponse,
          progress: {
            evaluated: totalEvaluated,
            total: totalAvailable,
          },
        },
      });
    }

    // All pairs have been evaluated
    const totalEvaluated = await Evaluation.countDocuments({ evaluatorId });
    return NextResponse.json({
      success: true,
      data: null,
      message: "All pairs have been evaluated",
      progress: {
        evaluated: totalEvaluated,
        total: systemBResponses.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching evaluation pair:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit evaluation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      sessionId,
      messageIndex,
      leftSystem,
      rightSystem,
      leftScores,
      rightScores,
      preference,
      comments,
      flaggedIssues,
      timeSpent,
      skipped,
    } = body;

    // Validate required fields
    if (
      !sessionId ||
      messageIndex === undefined ||
      !leftSystem ||
      !rightSystem
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Map left/right scores to system A/B scores
    const systemAScores = leftSystem === "A" ? leftScores : rightScores;
    const systemBScores = leftSystem === "B" ? leftScores : rightScores;

    const evaluatorId = session.user.email;

    // Check if already evaluated
    const existingEvaluation = await Evaluation.findOne({
      sessionId,
      messageIndex,
      evaluatorId,
    });

    if (existingEvaluation) {
      return NextResponse.json(
        { success: false, message: "This pair has already been evaluated" },
        { status: 400 }
      );
    }

    // Create new evaluation
    const evaluation = new Evaluation({
      sessionId,
      messageIndex,
      evaluatorId,
      evaluatorEmail: session.user.email,
      leftSystem,
      rightSystem,
      systemAScores,
      systemBScores,
      preference,
      comments,
      flaggedIssues: flaggedIssues || [],
      timeSpent: timeSpent || 0,
      skipped: skipped || false,
    });

    await evaluation.save();

    return NextResponse.json({
      success: true,
      message: "Evaluation submitted successfully",
      data: { evaluationId: evaluation._id },
    });
  } catch (error: any) {
    console.error("Error submitting evaluation:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
