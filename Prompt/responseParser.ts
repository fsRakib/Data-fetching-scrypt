export interface ParsedResponse {
  content: string;
  topics: string[];
  rawCode?: string;
  codeTitle?: string;
  postCodeContent?: string;
  probableQuestionType?: string;
}

export function parseResponse(response: string): ParsedResponse {
  //console.log("=== FRONTEND PARSING START ===");
  // //console.log("Response to parse:", response);

  let content = "";
  let topics: string[] = [];
  let rawCode: string | undefined;
  let codeTitle: string | undefined;
  let postCodeContent: string | undefined;
  let probableQuestionType: string | undefined;

  // Extract [answer] content
  const answerMatch = response.match(
    /\[answer\]:\s*([\s\S]*?)(?=\[code\]|\[code-title\]|\[fixed-code\]|\[explanation\]|\[annotated-code\]|Topics covered:|$)/i
  );
  if (answerMatch && answerMatch[1]) {
    content = answerMatch[1].trim();
    //console.log("Extracted content:", content);
  }

  // Extract [explanation] content (for CodeExplanation question type)
  if (!content) {
    const explanationMatch = response.match(
      /\[explanation\]:\s*([\s\S]*?)(?=\[annotated-code\]|\[code\]|\[code-title\]|\[fixed-code\]|Topics covered:|$)/i
    );
    if (explanationMatch && explanationMatch[1]) {
      content = explanationMatch[1].trim();
      //console.log("Extracted explanation content:", content);
    }
  }

  // Extract [code-title] content
  const codeTitleMatch = response.match(/\[code-title\]:\s*([^\n\r]+)/i);
  if (codeTitleMatch && codeTitleMatch[1]) {
    codeTitle = codeTitleMatch[1].trim();
    //console.log("Extracted code title:", codeTitle);
  }

  // Extract [annotated-code] to [end-annotated-code] content (for CodeExplanation question type)
  const annotatedCodeMatch = response.match(/\[annotated-code\]:\s*([\s\S]*?)\[end-annotated-code\]/i);
  if (annotatedCodeMatch && annotatedCodeMatch[1]) {
    let codeContent = annotatedCodeMatch[1].trim();

    // Remove [code-title] line if it exists within the code block
    codeContent = codeContent.replace(/\[code-title\]:[^\n]*\n?/g, "");

    // Handle markdown code blocks within the annotated-code tags
    if (codeContent.includes("```")) {
      // Extract code from markdown code blocks
      const markdownCodeMatch = codeContent.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
      if (markdownCodeMatch && markdownCodeMatch[1]) {
        codeContent = markdownCodeMatch[1].trim();
      }
    }

    // Clean up any extra whitespace but preserve code formatting
    rawCode = codeContent.trim();
    //console.log("Extracted annotated code:", rawCode);
  }

  // Extract [code] to [end-code] content OR [fixed-code] to [end-fixed-code] content (existing functionality)
  if (!rawCode) {
    const codeMatch = response.match(/\[(?:fixed-|annotated-)?code\]:\s*([\s\S]*?)\[(?:end-)?(?:fixed-|annotated-)?code\]/i);
    if (codeMatch && codeMatch[1]) {
      let codeContent = codeMatch[1].trim();

      // Remove [code-title] line if it exists within the code block
      codeContent = codeContent.replace(/\[code-title\]:[^\n]*\n?/g, "");

       // Handle markdown code blocks within the fixed-code tags
       if (codeContent.includes("```")) {
        // Extract code from markdown code blocks
        const markdownCodeMatch = codeContent.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
        if (markdownCodeMatch && markdownCodeMatch[1]) {
          codeContent = markdownCodeMatch[1].trim();
        }
      }

      // Clean up any extra whitespace but preserve code formatting
      rawCode = codeContent.trim();
      //console.log("Extracted raw code:", rawCode);
    }
  }

  // Extract content after [end-code], [end-fixed-code], or [end-annotated-code] but before topics
  const postCodeMatch = response.match(
    /\[end-(?:fixed-)?(?:annotated-)?code\]\s*([\s\S]*?)(?=Topics covered:|Main topics:|Key concepts:|Programming topics:|Concepts discussed:|\[topics\]:|Topics:|Probable Question Type:|$)/i
  );
  if (postCodeMatch && postCodeMatch[1]) {
    postCodeContent = postCodeMatch[1].trim();
    //console.log("Extracted post-code content:", postCodeContent);

     // Clean up markdown artifacts and extra formatting
     postCodeContent = postCodeContent.replace(/^```\s*$/gm, "").trim();
     postCodeContent = postCodeContent.replace(/^\s*\n+/gm, "\n").trim();
  }

  // Extract topics - multiple patterns to handle different formats
  const topicsPatterns = [
    /Topics covered:\s*([^\n\r]+)/i,
    /Main topics:\s*([^\n\r]+)/i,
    /Key concepts:\s*([^\n\r]+)/i,
    /Programming topics:\s*([^\n\r]+)/i,
    /Concepts discussed:\s*([^\n\r]+)/i,
    /\[topics\]:\s*([^\n\r]+)/i,
    /Topics:\s*([^\n\r]+)/i,
  ];

  for (const pattern of topicsPatterns) {
    const topicsMatch = response.match(pattern);
    if (topicsMatch && topicsMatch[1]) {
      //console.log("Found topics match:", topicsMatch[1]);

      topics = topicsMatch[1]
        .split(/[,;]/)
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0 && topic.length < 100)
        .slice(0, 6);

      if (topics.length > 0) {
        //console.log("Extracted topics:", topics);
        break;
      }
    }
  }

   // Extract question type - multiple patterns to handle different formats
   const questionTypePatterns = [
    /Probable Question Type:\s*\[?([^\n\r\]]+)\]?/i,
    /Question Type:\s*\[?([^\n\r\]]+)\]?/i,
    /Type:\s*\[?([^\n\r\]]+)\]?/i,
    /\[question-type\]:\s*([^\n\r]+)/i,
    /\[type\]:\s*([^\n\r]+)/i,
  ];

  for (const pattern of questionTypePatterns) {
    const questionTypeMatch = response.match(pattern);
    if (questionTypeMatch && questionTypeMatch[1]) {
      probableQuestionType = questionTypeMatch[1].trim();
       //console.log("Extracted question type:", probableQuestionType);
      break;
    }
  }

  // If no [answer] or [explanation] found, try to extract everything before [code], [fixed-code], [annotated-code], or topics
  if (
    !content &&
    (response.includes("[code") || response.includes("[fixed-code") || response.includes("[annotated-code") || response.includes("Topics covered:"))
  ) {
    const beforeCodeMatch = response.match(
      /^([\s\S]*?)(?=\[(?:fixed-)?(?:annotated-)?code\]|\[code-title\]|\[explanation\]|Topics covered:)/i
    );
    if (beforeCodeMatch && beforeCodeMatch[1]) {
      content = beforeCodeMatch[1].trim();
      // Remove any leading [answer]: or [explanation]: if present
      content = content.replace(/^\[(?:answer|explanation)\]:\s*/i, "");
      //console.log("Extracted content (alternative method):", content);
    }
  }

  // FIXED: Special handling for fixed-code responses - extract explanation after code block
  if (!content && response.includes("[fixed-code]") && postCodeContent) {
    // Look for explanation patterns in post-code content (including markdown headers)
    const explanationPatterns = [
      /###?\s*(Explanation|Changes|Fixes?):\s*([\s\S]*?)(?=Topics covered:|Probable Question Type:|$)/i,
      /###?\s*(Explanation|Changes|Fixes?)[:\s]*([\s\S]*?)(?=Topics covered:|Probable Question Type:|$)/i,
      /^###?\s*([\s\S]*?)(?=Topics covered:|Probable Question Type:|$)/i, // Any markdown header content
      /([\s\S]*?)(?=Topics covered:|Probable Question Type:|$)/i // Fallback to all content
    ];

    for (const pattern of explanationPatterns) {
      const explanationMatch = postCodeContent.match(pattern);
      if (explanationMatch) {
        const explanationText = explanationMatch[2] || explanationMatch[1];
        if (explanationText && explanationText.trim().length > 10) {
          content = explanationText.trim();
          //console.log("Extracted explanation from post-code content:", content);
          break;
        }
      }
    }
  }

  // IMPROVED: Better handling for responses that start with explanation before code
  if (!content && (response.includes("[fixed-code]") || response.includes("[annotated-code]"))) {
    // Extract content before [fixed-code] or [annotated-code] tag
    const beforeCodeMatch = response.match(/^([\s\S]*?)(?=\[(?:fixed-code|annotated-code)\])/i);
    if (beforeCodeMatch && beforeCodeMatch[1]) {
      let beforeCodeContent = beforeCodeMatch[1].trim();
      // Remove any leading [answer]: or [explanation]: if present
      beforeCodeContent = beforeCodeContent.replace(/^\[(?:answer|explanation)\]:\s*/i, "");
      
      if (beforeCodeContent.length > 10) {
        content = beforeCodeContent;
        //console.log("Extracted content before code:", content);
      }
    }
  }

  // If still no content, extract everything before topics section
  if (!content && topics.length > 0) {
    const beforeTopicsMatch = response.match(
      /^([\s\S]*?)(?=Topics covered:|Main topics:|Key concepts:|Programming topics:|Concepts discussed:|\[topics\]:|Topics:|Probable Question Type:)/i
    );
    if (beforeTopicsMatch && beforeTopicsMatch[1]) {
      content = beforeTopicsMatch[1].trim();
      // Remove any leading [answer]: or [explanation]: if present
      content = content.replace(/^\[(?:answer|explanation)\]:\s*/i, "");
      // Remove code blocks from content
      content = content.replace(/\[(?:fixed-)?(?:annotated-)?code\][\s\S]*?\[(?:end-)?(?:fixed-)?(?:annotated-)?code\]/gi, "").trim();
      //console.log("Extracted content (before topics):", content);
    }
  }

  // ENHANCED: Combine pre-code and post-code content for various code response types
  if ((response.includes("[fixed-code]") || response.includes("[annotated-code]")) && !content && postCodeContent) {
    // If we have post-code content but no main content, use post-code as content
    content = postCodeContent;
    //console.log("Using post-code content as main content for code response");
  }

  // If still no content, use the whole response (fallback)
  if (!content) {
    content = response.trim();
    // Remove topics and code sections from content
    content = content.replace(/Topics covered:.*$/gm, "").trim();
    content = content.replace(/Probable Question Type:.*$/gm, "").trim();
    content = content.replace(/\[(?:fixed-)?(?:annotated-)?code\][\s\S]*?\[(?:end-)?(?:fixed-)?(?:annotated-)?code\]/gi, "").trim();
    //console.log("Using cleaned response as content (fallback)");
  }

  // Clean up content - remove any remaining topic lines and markdown artifacts
  content = content.replace(/Topics covered:.*$/gm, "").trim();
  content = content.replace(/Main topics:.*$/gm, "").trim();
  content = content.replace(/Key concepts:.*$/gm, "").trim();
  content = content.replace(/Probable Question Type:.*$/gm, "").trim();
  content = content.replace(/^```\s*$/gm, "").trim();

  // Remove any trailing topic lines that might have been missed
  content = content.replace(/Topics covered:[\s\S]*$/i, "").trim();
  content = content.replace(/Probable Question Type:[\s\S]*$/i, "").trim();

  // Fallback topics if none found
  if (topics.length === 0) {
    topics = [];
    //console.log("Using fallback topics:", topics);
  }
  // Fallback question type if none found
  // if (!probableQuestionType || probableQuestionType === "") {
  //   probableQuestionType = "GeneralQuestion";
  // }

  //console.log("Final questionType:", probableQuestionType);

  return { content, topics, rawCode, codeTitle, postCodeContent, probableQuestionType };
}