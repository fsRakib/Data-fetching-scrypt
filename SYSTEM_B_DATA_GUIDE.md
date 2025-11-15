# System B Data Storage & Evaluation Guide

This guide explains how to store System B responses and use them for side-by-side evaluation against System A.

## 📊 Data Architecture Overview

### System A (Production Data)
- **Collection**: `sessions`
- **Contains**: All production chat sessions with user questions and System A responses
- **Status**: Read-only for evaluation purposes
- **Schema**: Defined in `src/model/session-model.ts`

### System B (Alternative Responses)
- **Collection**: `system-b-responses`
- **Contains**: Alternative responses generated for the same user questions
- **Status**: Populated separately for evaluation
- **Schema**: Defined in `src/model/system-b-response-model.ts`

### Evaluations
- **Collection**: `evaluations`
- **Contains**: Human evaluation results comparing System A vs System B
- **Schema**: Defined in `src/model/evaluation-model.ts`

---

## 🗄️ Data Schema Details

### System B Response Schema

```typescript
{
  sessionId: string,              // Links to sessions collection
  messageIndex: number,            // Which user message (0 = first Q&A pair)
  userMessage: string,             // Denormalized user question
  assistantResponse: string,       // System B's response
  questionType?: string,           // e.g., "explain-code", "write-code"
  codeContent?: string,            // Code snippet if applicable
  codeLanguage?: string,           // e.g., "javascript", "python"
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- Compound index on `(sessionId, messageIndex)` - ensures one System B response per message
- Single index on `sessionId` - fast lookup by session

---

## 📝 Step-by-Step: Storing System B Data

### Step 1: Identify Sessions to Evaluate

Query your System A sessions to find suitable candidates:

```javascript
// Get first 100 sessions with at least one Q&A pair
db.sessions.find({
  "messages.1": { $exists: true }  // Has at least 2 messages (user + assistant)
}).limit(100)
```

### Step 2: Generate System B Responses

For each session, you need to:
1. Extract the **first user message** (index 0)
2. Generate an alternative response using System B (your improved model/prompt)
3. Store it in the `system-b-responses` collection

**Manual Approach:**

```javascript
// Example: Manually add System B response
const systemBResponse = {
  sessionId: "abc123",
  messageIndex: 0,
  userMessage: "How do I reverse a string in JavaScript?",
  assistantResponse: "Here's how to reverse a string in JavaScript...", // Your System B response
  questionType: "write-code",
  codeContent: "const str = 'hello';",
  codeLanguage: "javascript"
};

// Insert directly to MongoDB
db.systembresponses.insertOne(systemBResponse);
```

### Step 3: Automated Generation Script

Create a script to generate System B responses programmatically:

```typescript
// filepath: src/scripts/generate-system-b-responses.ts
import dbConnect from "@/lib/dbConnect";
import Session from "@/model/session-model";
import SystemBResponse from "@/model/system-b-response-model";
import { generateSystemBResponse } from "@/lib/system-b-generator"; // Your System B logic

async function generateSystemBResponses() {
  await dbConnect();

  // Get sessions that don't have System B responses yet
  const sessions = await Session.find({
    "messages.1": { $exists: true }
  }).limit(100);

  console.log(`Found ${sessions.length} sessions to process`);

  for (const session of sessions) {
    try {
      // Check if System B response already exists
      const exists = await SystemBResponse.findOne({
        sessionId: session.sessionId,
        messageIndex: 0
      });

      if (exists) {
        console.log(`Skipping ${session.sessionId} - already exists`);
        continue;
      }

      // Get first user message
      const userMessage = session.messages.find(m => m.role === "user");
      const systemAMessage = session.messages.find(m => m.role === "assistant");

      if (!userMessage || !systemAMessage) {
        console.log(`Skipping ${session.sessionId} - invalid message structure`);
        continue;
      }

      // Generate System B response
      console.log(`Generating System B response for ${session.sessionId}...`);
      const systemBResponseText = await generateSystemBResponse({
        userMessage: userMessage.content,
        codeContent: userMessage.codeContent,
        codeLanguage: userMessage.codeLanguage,
        questionType: userMessage.questionType
      });

      // Store System B response
      await SystemBResponse.create({
        sessionId: session.sessionId,
        messageIndex: 0,
        userMessage: userMessage.content,
        assistantResponse: systemBResponseText,
        questionType: userMessage.questionType,
        codeContent: userMessage.codeContent,
        codeLanguage: userMessage.codeLanguage
      });

      console.log(`✅ Saved System B response for ${session.sessionId}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${session.sessionId}:`, error);
    }
  }

  console.log("Done!");
}

generateSystemBResponses();
```

**Run the script:**
```bash
npx tsx src/scripts/generate-system-b-responses.ts
```

---

## 🔄 Evaluation Flow

### How the Evaluation Page Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Evaluation Request                        │
│                  GET /api/evaluation                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Find unevaluated session  │
         │  with System B response    │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Fetch System A response   │
         │  from sessions collection  │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Randomize left/right      │
         │  positioning (blind test)  │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Return both responses     │
         │  for side-by-side display  │
         └────────────────────────────┘
```

### Data Retrieval Logic

```typescript
// Pseudo-code for GET /api/evaluation

// 1. Find sessions already evaluated by this user
const evaluated = await Evaluation.find({ 
  evaluatorId: currentUserId 
}).distinct('sessionId');

// 2. Find System B response not yet evaluated
const systemBDoc = await SystemBResponse.findOne({
  sessionId: { $nin: evaluated }
}).lean();

// 3. Fetch corresponding System A session
const sessionA = await Session.findOne({
  sessionId: systemBDoc.sessionId
}).lean();

// 4. Extract System A response (first assistant message)
const systemAResponse = sessionA.messages.find(
  m => m.role === "assistant"
)?.content;

// 5. Randomize positioning
const leftIsA = Math.random() > 0.5;

// 6. Return for evaluation
return {
  sessionId: systemBDoc.sessionId,
  messageIndex: 0,
  userMessage: {
    content: systemBDoc.userMessage,
    codeContent: systemBDoc.codeContent,
    codeLanguage: systemBDoc.codeLanguage
  },
  leftSystem: leftIsA ? "A" : "B",
  rightSystem: leftIsA ? "B" : "A",
  leftResponse: leftIsA ? systemAResponse : systemBDoc.assistantResponse,
  rightResponse: leftIsA ? systemBDoc.assistantResponse : systemAResponse,
  progress: { evaluated: evaluated.length, total: totalCount }
};
```

---

## 📋 Evaluation Submission

### When User Submits Evaluation

```typescript
// POST /api/evaluation

{
  sessionId: "abc123",
  messageIndex: 0,
  leftSystem: "A",           // Which system was on left
  rightSystem: "B",          // Which system was on right
  leftScores: { overall: 4 },
  rightScores: { overall: 5 },
  preference: "B",           // Auto-calculated from scores
  comments: "System B was clearer",
  flaggedIssues: ["A response had error"],
  timeSpent: 45,             // seconds
  skipped: false
}
```

**Stored in `evaluations` collection:**
```typescript
{
  sessionId: "abc123",
  messageIndex: 0,
  evaluatorId: "user-xyz",
  evaluatorEmail: "user@example.com",
  timestamp: ISODate("2025-11-15T10:30:00Z"),
  
  leftSystem: "A",
  rightSystem: "B",
  
  systemAScores: { overall: 4 },
  systemBScores: { overall: 5 },
  
  preference: "B",
  comments: "System B was clearer",
  flaggedIssues: ["A response had error"],
  timeSpent: 45,
  skipped: false
}
```

---

## 🎯 Best Practices

### 1. **Data Quality**
- ✅ Only evaluate sessions with meaningful conversations
- ✅ Ensure System B responses are generated with same context as System A
- ✅ Validate that code snippets are preserved correctly

### 2. **Sampling Strategy**
- ✅ Randomly sample sessions for evaluation (avoid bias)
- ✅ Include diverse question types (explain, write, fix, etc.)
- ✅ Balance code-heavy vs text-heavy questions

### 3. **Evaluation Guidelines**
- ✅ Have multiple evaluators review the same pairs (inter-rater reliability)
- ✅ Provide clear rating criteria to evaluators
- ✅ Include attention checks (obvious quality differences)

### 4. **Data Management**
- ✅ Keep System A data read-only
- ✅ Version your System B responses (track prompt changes)
- ✅ Backup evaluation data regularly

---

## 🚀 Quick Start Workflow

### 1. Check System Status
```bash
# Visit to see if System B data exists
http://localhost:3000/evaluation/status
```

### 2. Populate System B Responses

**Option A: Use Seed Script (Dummy Data for Testing)**
```bash
npm run seed:system-b
```

**Option B: Generate Real Responses**
```bash
# Create your own generation script
npx tsx src/scripts/generate-system-b-responses.ts
```

### 3. Start Evaluating
```bash
# Visit evaluation page
http://localhost:3000/evaluation
```

### 4. View Results
```bash
# Check statistics
http://localhost:3000/evaluation/stats
```

---

## 📊 Example: Complete Data Flow

### Initial State
```javascript
// sessions collection (System A)
{
  sessionId: "session-001",
  messages: [
    { 
      role: "user", 
      content: "How to sort an array in JavaScript?",
      questionType: "write-code",
      codeContent: "",
      codeLanguage: "javascript"
    },
    { 
      role: "assistant", 
      content: "Use array.sort() method...", // System A response
      version: "1.0"
    }
  ],
  createdAt: ISODate("2025-11-10T10:00:00Z")
}
```

### After Generating System B
```javascript
// system-b-responses collection
{
  sessionId: "session-001",
  messageIndex: 0,
  userMessage: "How to sort an array in JavaScript?",
  assistantResponse: "You can sort arrays using .sort()...", // System B response
  questionType: "write-code",
  codeContent: "",
  codeLanguage: "javascript",
  createdAt: ISODate("2025-11-15T09:00:00Z")
}
```

### After Evaluation
```javascript
// evaluations collection
{
  sessionId: "session-001",
  messageIndex: 0,
  evaluatorId: "evaluator-alice",
  evaluatorEmail: "alice@example.com",
  leftSystem: "B",  // System B was on left
  rightSystem: "A", // System A was on right
  systemAScores: { overall: 3 },
  systemBScores: { overall: 5 },
  preference: "B",
  comments: "System B provided better examples",
  timeSpent: 65,
  skipped: false,
  createdAt: ISODate("2025-11-15T10:30:00Z")
}
```

---

## 🔍 Querying Evaluation Results

### Get Win Rate for System B
```javascript
db.evaluations.aggregate([
  {
    $group: {
      _id: "$preference",
      count: { $sum: 1 }
    }
  }
])

// Result:
// { _id: "A", count: 23 }
// { _id: "B", count: 45 }
// { _id: "tie", count: 12 }
```

### Get Average Scores
```javascript
db.evaluations.aggregate([
  {
    $group: {
      _id: null,
      avgScoreA: { $avg: "$systemAScores.overall" },
      avgScoreB: { $avg: "$systemBScores.overall" }
    }
  }
])

// Result:
// { avgScoreA: 3.8, avgScoreB: 4.2 }
```

### Export Evaluation Data
```javascript
// Export to CSV for analysis
db.evaluations.find({}).forEach(function(doc) {
  print(
    doc.sessionId + "," + 
    doc.systemAScores.overall + "," + 
    doc.systemBScores.overall + "," + 
    doc.preference + "," + 
    doc.timeSpent
  );
});
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Duplicate System B Responses
**Solution:** Compound index prevents duplicates
```javascript
// Already handled in schema
systemBResponseSchema.index(
  { sessionId: 1, messageIndex: 1 }, 
  { unique: true }
);
```

### Issue 2: No System B Data Found
**Solution:** Check status page
```bash
http://localhost:3000/evaluation/status
```

### Issue 3: Evaluation Page Shows Dummy Data
**Solution:** Generate real System B responses first
```bash
npx tsx src/scripts/generate-system-b-responses.ts
```

### Issue 4: Mismatched Session IDs
**Problem:** System B response has sessionId that doesn't exist in sessions collection

**Solution:**
```javascript
// Verify sessionId exists before creating System B response
const sessionExists = await Session.findOne({ sessionId: "abc123" });
if (!sessionExists) {
  console.error("Session not found!");
  return;
}
```

---

## 📚 Related Files

### Models
- `src/model/session-model.ts` - System A sessions
- `src/model/system-b-response-model.ts` - System B responses
- `src/model/evaluation-model.ts` - Evaluation results

### API Routes
- `src/app/api/evaluation/route.ts` - Fetch & submit evaluations
- `src/app/api/evaluation/stats/route.ts` - Get statistics

### UI Pages
- `src/app/evaluation/page.tsx` - Evaluation interface
- `src/app/evaluation/stats/page.tsx` - Statistics dashboard
- `src/app/evaluation/status/page.tsx` - System status

### Scripts
- `src/scripts/seed-system-b-responses.ts` - Seed dummy data
- `src/scripts/generate-system-b-responses.ts` - Generate real responses (you need to create this)

---

## 🛠️ Creating Your System B Generator

You'll need to create a function that generates System B responses. Here's a template:

```typescript
// filepath: src/lib/system-b-generator.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

interface GenerateRequest {
  userMessage: string;
  codeContent?: string;
  codeLanguage?: string;
  questionType: string;
}

export async function generateSystemBResponse(
  request: GenerateRequest
): Promise<string> {
  const { userMessage, codeContent, codeLanguage, questionType } = request;

  // Build your improved prompt here
  let prompt = `You are an expert programming tutor. Answer the following question clearly and concisely.\n\n`;
  prompt += `Question: ${userMessage}\n\n`;
  
  if (codeContent) {
    prompt += `Code Context (${codeLanguage}):\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\`\n\n`;
  }

  // Generate response using your System B (improved prompt/model)
  const { text } = await generateText({
    model: openai("gpt-4"), // or your preferred model
    prompt: prompt,
    temperature: 0.7,
  });

  return text;
}
```

---

## ✅ Pre-Launch Checklist

Before starting evaluation:
- [ ] System A sessions exist in database
- [ ] System B responses generated for target sessions
- [ ] Compound index created on `(sessionId, messageIndex)`
- [ ] Evaluators have accounts and are logged in
- [ ] Evaluation guidelines documented for evaluators
- [ ] Tested with dummy data first (`npm run seed:system-b`)
- [ ] Verified data retrieval works at `/evaluation/status`

---

## 📈 After Evaluation

Once you've collected evaluations:

1. **Analyze Results** at `/evaluation/stats`
2. **Export Data** for deeper analysis
3. **Identify Patterns** where System B performs better/worse
4. **Iterate** on prompts/models based on findings
5. **Document Insights** for team review

---

**Questions?** Check `/evaluation/status` to verify your setup!

For more details:
- See `EVALUATION_QUICKSTART.md` for quick start
- See `EVALUATION_SYSTEM.md` for complete system documentation
- See `TESTING_WITH_DUMMY_DATA.md` for testing guide
