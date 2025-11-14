import OpenAI from "openai";

import {
  mainAskFromCode,
  replyAskFromCode,
} from "../codex-prompts/ask-from-code-prompt";
import {
  mainAskQuestion,
  replyAskQuestion,
} from "../codex-prompts/ask-question-prompt";
import {
  mainExplainCode,
  replyExplainCode,
} from "../codex-prompts/explain-code-prompt";
import { mainFixCode, replyFixCode } from "../codex-prompts/fix-code-prompt";
import {
  mainWriteCode,
  replyWriteCode,
} from "../codex-prompts/write-code-prompt";

export interface LLMRequestParams {
  questionType: string;
  studentPrompt: string;
  codeContent?: string;
  codeLanguage?: string;
  codeOutputPreference: string;
  temperature?: number;
  previousMessages?: string[];
}

export interface LLMResponse {
  rawResponse: string;
}

export async function callLLM(params: LLMRequestParams): Promise<LLMResponse> {
  const {
    questionType,
    studentPrompt,
    codeContent,
    codeLanguage,
    codeOutputPreference,
    previousMessages,
    temperature,
  } = params;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let promptConfig;

  const hasPreviousMessages = previousMessages && previousMessages.length > 0;
  // console.log("==llm.ts==== PROMPT SELECTION ===");
  // console.log("==llm.ts=Question type:", questionType);
  // console.log("==llm.ts=Has previous messages:", hasPreviousMessages);
  // console.log("==llm.ts=Previous messages count:", previousMessages?.length || 0);
  // console.log("==llm.ts=Code content available:", !!(codeContent && codeContent.trim()));

  switch (questionType) {
    case "GeneralQuestion":
      if (hasPreviousMessages) {
        promptConfig = replyAskQuestion(previousMessages, studentPrompt);
      } else {
        promptConfig = mainAskQuestion(studentPrompt);
      }
      break;
    case "QuestionFromCode":
      if (hasPreviousMessages) {
        promptConfig = replyAskFromCode(
          codeContent || "",
          previousMessages,
          studentPrompt
        );
      } else {
        promptConfig = mainAskFromCode(studentPrompt, codeContent || "");
      }
      break;
    case "CodeExplanation":
      if (hasPreviousMessages) {
        promptConfig = replyExplainCode(
          codeContent || "",
          previousMessages,
          studentPrompt
        );
      } else {
        promptConfig = mainExplainCode(codeContent || "", studentPrompt);
      }
      break;
    case "HelpFixCode":
      if (hasPreviousMessages) {
        promptConfig = replyFixCode(
          previousMessages,
          studentPrompt,
          codeContent || ""
        );
      } else {
        promptConfig = mainFixCode(studentPrompt, codeContent || "");
      }
      break;
    case "HelpWriteCode":
      if (hasPreviousMessages) {
        promptConfig = replyWriteCode(previousMessages, studentPrompt);
      } else {
        promptConfig = mainWriteCode(studentPrompt);
      }
      break;
    default:
      if (hasPreviousMessages) {
        promptConfig = replyAskQuestion(previousMessages, studentPrompt);
      } else {
        promptConfig = mainAskQuestion(studentPrompt);
      }
  }

  // console.log("==llm.ts=Original prompt config:", promptConfig);

  const enhancedSystemPrompt = getSystemPromptForQuestionType(
    questionType,
    hasPreviousMessages,
    codeOutputPreference
  );

  let userMessage = `[follow-up-question]: ${studentPrompt}`;

  // Add code content to follow-up questions if available
  if (hasPreviousMessages && codeContent && codeContent.trim()) {
    //\n\`\`\`${ codeLanguage || ""
    userMessage += `\n\nCode provided (${codeLanguage}):
    \n${codeContent}\n\`\`\``;
  } else if (!hasPreviousMessages) {
    userMessage = `[question]: ${studentPrompt}`;
    if (codeContent && codeContent.trim()) {
      userMessage += `\n\nCode provided (${codeLanguage}):
      \n${codeContent}\n\`\`\``;
    }
  }

  let messages;

  if (hasPreviousMessages) {
    messages = [
      {
        role: "system" as const,
        content: enhancedSystemPrompt,
      },
      ...promptConfig.messages.slice(0, -1), // All messages except the last one
    ];

    messages.push({
      role: "user" as const,
      content: userMessage,
    });
  } else {
    messages = [
      {
        role: "system" as const,
        content: enhancedSystemPrompt,
      },
      ...promptConfig.messages,
      // Add current question if it's not already included in promptConfig
      ...(promptConfig.messages.some((msg) =>
        msg.content.includes(studentPrompt)
      )
        ? []
        : [
            {
              role: "user" as const,
              content: userMessage,
            },
          ]),
    ];
  }

  // console.log("==llm.ts=Final messages sent to OpenAI:");
  // messages.forEach((msg, idx) => {
  //   console.log(
  //     `Message ${idx} (${msg.role}):`,
  //     msg.content || "No content provided"
  //   );
  // });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages as any,
    temperature: temperature || promptConfig.temperature,
    max_tokens: promptConfig.max_tokens || 2500,
    stop: promptConfig.stop,
  });

  // console.log("==llm.ts==== OPENAI RESPONSE ===");
  // console.log("==llm.ts=Full response:", JSON.stringify(response, null, 2));

  const rawResponse =
    response.choices[0].message.content || "No response found";

  // console.log("==llm.ts==== FINAL RESULTS ===");
  // console.log("==llm.ts=Raw response:", rawResponse);
  // console.log("==llm.ts==== LLM CALL END ===");

  return {
    rawResponse: rawResponse,
  };
}

function getSystemPromptForQuestionType(
  questionType: string,
  hasPreviousMessages: boolean = false,
  codeOutputPreference: string,
): string {
  console.log("Code Output Preference:", codeOutputPreference);

  // Base system prompt with core instructions
  let systemPrompt = `You are a helpful AI assistant for programming education specializing in C and C++ programming languages. Provide clear, comprehensive explanations with practical examples.

CORE REQUIREMENTS:
1. Language Restriction: Only provide code examples in C or C++ programming languages
2. Relevance Check: Only answer programming-related questions
3. Educational Focus: Help students understand underlying concepts, not just provide solutions

RESPONSE STRUCTURE:
Your response must follow this exact format:
[answer]: Your detailed explanation here...`;

  // Add code output preference specific instructions
  switch (codeOutputPreference) {
    case "NoCode":
      systemPrompt += `

CODE OUTPUT PREFERENCE: NO CODE
- Do NOT include any code snippets or examples in your response
- Focus ONLY on conceptual explanations and theory
- Explain algorithms and logic using natural language descriptions
- Use analogies and real-world examples to illustrate programming concepts
- If code structure needs to be discussed, describe it in words (e.g., "use a loop structure", "create a function that takes two parameters")`;
      break;

    case "PseudoCode":
      systemPrompt += `

CODE OUTPUT PREFERENCE: PSEUDOCODE ONLY
- Provide algorithm logic in pseudocode format using plain English-like statements
- Use structured pseudocode with proper indentation
- Format: [code]: [code-title]: Algorithm/Logic Description // Your pseudocode here [end-code]
- Example pseudocode style:
  BEGIN
    SET variable = value
    IF condition THEN
      DO something
    ENDIF
    FOR each item
      PROCESS item
    ENDFOR
  END
- Do NOT use actual C/C++ syntax, keywords, or specific programming language constructs`;
      break;

    case "WithCode":
    default:
      systemPrompt += `

CODE OUTPUT PREFERENCE: COMPLETE CODE EXAMPLES
- Provide complete, working code examples in C or C++ 
- Use proper syntax and follow best practices
- Include detailed comments explaining each section
- Format: [code]: [code-title]: Descriptive title // Complete working code with comments [end-code]
- Ensure code is compilable and follows good programming standards`;
      break;
  }

  // Add question-type specific instructions
  systemPrompt += `

QUESTION TYPE HANDLING:`;

  switch (questionType) {
    case "GeneralQuestion":
      systemPrompt += `
- Type: General Programming Concepts
- Focus: Provide comprehensive theoretical explanations
- Include: Definitions, concepts, best practices, and examples
- Explain: Why concepts are important and when to use them`;
      break;

    case "QuestionFromCode":
      systemPrompt += `
- Type: Questions About Existing Code
- Focus: Analyze and explain the provided code
- Include: Direct references to specific code parts
- Explain: How the code works and why it's written that way`;
      break;

    case "CodeExplanation":
      systemPrompt += `
- Type: Code Explanation Request
- Focus: Break down code step-by-step
- Include: Line-by-line or section-by-section analysis
- Explain: Execution flow, purpose of each part, and programming concepts used
- Help students build a mental model of code execution`;
      break;

    case "HelpFixCode":
      systemPrompt += `
- Type: Code Debugging and Fixing
- Focus: Identify issues and provide corrections
- Include: Clear explanation of what's wrong and why
- Format corrected code as: [fixed-code]: // Your corrected code here [end-fixed-code]
- Explain: The debugging process and how to avoid similar issues`;
      break;

    case "HelpWriteCode":
      systemPrompt += `
- Type: Code Writing from Scratch
- Focus: Provide complete, well-structured solutions
- Include: Step-by-step approach to solving the problem
- Explain: Design decisions, algorithm choices, and implementation details
- Follow: Best practices and coding standards`;
      break;

    default:
      systemPrompt += `
- Type: General Programming Question (Default)
- Focus: Provide comprehensive explanations with relevant examples
- Include: Clear concepts and practical applications`;
  }

  // Add conversation context handling
  if (hasPreviousMessages) {
    systemPrompt += `

CONVERSATION CONTEXT:
- You are continuing an ongoing conversation
- Reference previous topics when relevant and build upon established context
- Maintain consistency with previous explanations
- Expand the discussion naturally while staying focused on the current question
- If the student references previous examples or code, acknowledge and connect to current response`;
  }

  // Add mandatory closing requirements
  systemPrompt += `

MANDATORY CLOSING FORMAT:
Every response MUST end with these two lines:
Topics covered: concept1, concept2, concept3, concept4, concept5, concept6;
Probable Question Type: [DeterminedQuestionType]

QUESTION TYPE CLASSIFICATION:
Based on your response content, classify it as one of these types:
- GeneralQuestion: If you explained theoretical programming concepts, definitions, or general knowledge
- QuestionFromCode: If you analyzed or answered questions about specific existing code
- CodeExplanation: If you provided step-by-step breakdown of how code works
- HelpFixCode: If you identified and corrected code issues or bugs
- HelpWriteCode: If you created new code from scratch to solve a problem

Choose the type that best matches what you actually provided in your response, not what was initially requested.

ERROR RESPONSES:
- For non-programming questions: "Sorry, this is an irrelevant question. Please ask questions related to programming."
- For non-C/C++ code requests: "Sorry, I can only provide code examples in C or C++ programming languages."

QUALITY STANDARDS:
- Be thorough but concise
- Use clear, educational language appropriate for students
- Provide practical insights that help with learning
- Ensure accuracy in all technical details
- Make explanations progressive (simple to complex when needed)`;

  return systemPrompt;
}
