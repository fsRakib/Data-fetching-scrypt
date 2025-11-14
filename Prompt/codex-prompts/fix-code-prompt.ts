// Define our own ChatCompletionRequestMessage interface
interface ChatCompletionRequestMessage {
    role: "system" | "user" | "assistant";
    content: string;
    name?: string;
}


export const mainFixCode = (behavior: string, code: string) => {
    const messages: Array<ChatCompletionRequestMessage> = [
        {
            role: "system",
            content:
                "generate the fixed code in c/c++ programming of the provided code based on the intended behavior. try to use the same structure of the provided [code]. focus on segmentation faults, logical errors, memory leaks, and other common errors. you can use the [intended-behavior] to help you understand the intended behavior of the code. Always include line numbers in your code and show the line number where the problem occurred and you fix with detailed explanation",
        },
        {
            role: "user",
            content: `[code]:
  void fib(int **arr, int count) {
      *arr = malloc(count * sizeof(int));
      
      if (count == 0) {
          *arr[0] = 0;
      } else if (count == 1) {
          *arr[0] = 0;
          *arr[1] = 1;
      }
  
      for (int i = 2; i < count; i++) {
          *arr[i] = *arr[i - 1] + *arr[i - 2];
      }
  
      return arr;
  }
  [intended-behavior]: take in an int n, and generates the first n elements of the Fibonacci sequence.`,
        },
        {
            role: "assistant",
            content: `[answer]:The original code has several critical issues:

Line 4-5: Logical error - "if (count == 0)" followed by "*arr[0] = 0" will cause segmentation fault because when count is 0, no memory is allocated for the array, but we're trying to access index 0.

Line 5, 7, 9: Pointer dereferencing error - "*arr[0]" and "*arr[1]" are incorrect syntax. Since arr is a double pointer (int **), we need to use "(*arr)[0]" and "(*arr)[1]" to properly access array elements.

Line 6-9: Logic flaw - The else-if structure means when count=1, we set both arr[0] and arr[1], but we only allocated space for 1 element, causing buffer overflow.

Line 12-13: Same pointer dereferencing error - "*arr[i]" should be "(*arr)[i]".

Line 15: Return type mismatch - Function is declared as void but tries to return arr.

[fixed-code]:
   void fib(int **arr, int count) {
       *arr = malloc(count * sizeof(int));
   
       if (count > 0) {                    // FIXED: Changed from "count == 0" to "count > 0"
           (*arr)[0] = 0;                  // FIXED: Changed from "*arr[0]" to "(*arr)[0]"
       }
   
       if (count > 1) {                    // FIXED: Changed from "else if (count == 1)" to "if (count > 1)"
           (*arr)[1] = 1;                  // FIXED: Changed from "*arr[1]" to "(*arr)[1]"
      }
  
      for (int i = 2; i < count; i++) {
          (*arr)[i] = (*arr)[i - 1] + (*arr)[i - 2];  // FIXED: Changed from "*arr[i]" to "(*arr)[i]"
      }
  }                                       // FIXED: Removed "return arr;" as function is void
[end-fixed-code]

Line 4: Changed condition from "if (count == 0)" to "if (count > 0)" to ensure we only access array elements when memory is actually allocated. This prevents segmentation fault when count is 0.

Line 5: Fixed pointer dereferencing from "*arr[0] = 0" to "(*arr)[0] = 0". The original syntax was treating arr as array of pointers, but arr is a pointer to pointer, so we need parentheses to properly dereference.

Line 8: Changed from "else if (count == 1)" to "if (count > 1)" to fix the logical flow. Now when count=1, we only set the first element. When count>1, we set both first and second elements.

Line 9: Fixed pointer dereferencing from "*arr[1] = 1" to "(*arr)[1] = 1" for the same reason as line 5.

Line 13: Fixed pointer dereferencing in the loop from "*arr[i] = *arr[i-1] + *arr[i-2]" to "(*arr)[i] = (*arr)[i-1] + (*arr)[i-2]" to properly access array elements through double pointer.

Line 15: Removed the "return arr;" statement since the function is declared as void and doesn't need to return anything.
[STOP-end-fixed-code-STOP]`,
        },
        {
            role: "user",
            content: `[code]:
  ${code}
  [intended-behavior]: ${behavior}`,
        },
    ];

    return {
        messages,
        stop: ["[STOP-end-fixed-code-STOP]"],
        temperature: 0.05,
        max_tokens: 2048,
    };
};


export const replyFixCode = (
    prevResponses: string[] | undefined,
    newBehavior: string,
    newCode: string
) => {
    const messages: Array<ChatCompletionRequestMessage> = [
        {
            role: "system",
            content:
                "generate the fixed code in c/c++ programming of the provided code based on the intended behavior. try to use the same structure of the provided [code]. focus on segmentation faults, logical errors, memory leaks, and other common errors. you can use the [intended-behavior] to help you understand the intended behavior of the code. for follow-up code fixes, consider the context of previous fixes and explanations. Always include line numbers in your code and show the line number where the problem occurred and you fix with detailed explanation.",
        },
        {
            role: "user",
            content: `[code]:
  void fib(int **arr, int count) {
      *arr = malloc(count * sizeof(int));
      
      if (count == 0) {
          *arr[0] = 0;
      } else if (count == 1) {
          *arr[0] = 0;
          *arr[1] = 1;
      }
  
      for (int i = 2; i < count; i++) {
          *arr[i] = *arr[i - 1] + *arr[i - 2];
      }
  
      return arr;
  }
  [intended-behavior]: take in an int n, and generates the first n elements of the Fibonacci sequence.`,
        },
        {
            role: "assistant",
            content: `[answer]:The original code has several critical issues:

Line 4-5: Logical error - "if (count == 0)" followed by "*arr[0] = 0" will cause segmentation fault because when count is 0, no memory is allocated for the array, but we're trying to access index 0.

Line 5, 7, 9: Pointer dereferencing error - "*arr[0]" and "*arr[1]" are incorrect syntax. Since arr is a double pointer (int **), we need to use "(*arr)[0]" and "(*arr)[1]" to properly access array elements.

Line 6-9: Logic flaw - The else-if structure means when count=1, we set both arr[0] and arr[1], but we only allocated space for 1 element, causing buffer overflow.

Line 12-13: Same pointer dereferencing error - "*arr[i]" should be "(*arr)[i]".

Line 15: Return type mismatch - Function is declared as void but tries to return arr.

[fixed-code]:
   void fib(int **arr, int count) {
       *arr = malloc(count * sizeof(int));
   
       if (count > 0) {                    // FIXED: Changed from "count == 0" to "count > 0"
           (*arr)[0] = 0;                  // FIXED: Changed from "*arr[0]" to "(*arr)[0]"
       }
   
       if (count > 1) {                    // FIXED: Changed from "else if (count == 1)" to "if (count > 1)"
           (*arr)[1] = 1;                  // FIXED: Changed from "*arr[1]" to "(*arr)[1]"
      }
  
      for (int i = 2; i < count; i++) {
          (*arr)[i] = (*arr)[i - 1] + (*arr)[i - 2];  // FIXED: Changed from "*arr[i]" to "(*arr)[i]"
      }
  }                                       // FIXED: Removed "return arr;" as function is void
[end-fixed-code]`,
        },
        {
            role: "user",
            content: `[follow-up-code]:
  void fib(int **arr, int count) {
      *arr = malloc(count * sizeof(int));
  
      if (count > 0) {
          (*arr)[0] = 0;
      }
  
      if (count > 1) {
          (*arr)[1] = 1;
      }
      
      for (int i = 2; i < count; i++) {
          (*arr)[i] = (*arr)[i - 1] + (*arr)[i - 2];
      }
  }
  [intended-behavior]: add proper error handling for memory allocation failure and handle edge cases better.`,
        },
        {
            role: "assistant",
            content: `[answer]:
The current code still has some issues that need to be addressed:

Line 2: Memory allocation error handling - malloc can fail and return NULL, but we don't check for this before using the allocated memory.

Line 2: Memory leak potential - If the function is called multiple times, the caller needs to know to free the allocated memory.

Edge case handling - When count is 0 or negative, we should handle these cases more gracefully.

[fixed-code]:
   void fib(int **arr, int count) {
       if (count <= 0) {                   // FIXED: Added edge case handling for count <= 0
           *arr = NULL;
           return;
       }
   
       *arr = malloc(count * sizeof(int)); // FIXED: Added memory allocation
       if (*arr == NULL) {                 // FIXED: Added null check for malloc failure
           return;                         // Return early if allocation fails
      }
  
      (*arr)[0] = 0;                      // First Fibonacci number
  
      if (count > 1) {
          (*arr)[1] = 1;                  // Second Fibonacci number
      }
      
      for (int i = 2; i < count; i++) {
          (*arr)[i] = (*arr)[i - 1] + (*arr)[i - 2];
      }
  }
[end-fixed-code]

Line 2-5: Added edge case handling for count <= 0. When count is 0 or negative, we set *arr to NULL and return early to avoid unnecessary memory allocation.

Line 8-10: Added proper error handling for malloc failure. If malloc returns NULL, we return early to prevent segmentation faults from accessing NULL pointer.

Line 12: Since we now guarantee count > 0 due to the edge case check, we can safely set the first element without additional conditions.

The caller should check if *arr is NULL after calling this function to handle both edge cases and memory allocation failures appropriately.
[STOP-end-fixed-code-STOP]`,
        },
    ];

    if (prevResponses && prevResponses.length !== 0) {
        // Process the first message
        const firstResponse = prevResponses[0];

        // Extract code and behavior from first response
        const lines = firstResponse.split('\n');

        // Find the lines containing [code]: and [intended-behavior]:
        const codeStartIndex = lines.findIndex(line => line.trim().startsWith('[code]:'));
        const behaviorIndex = lines.findIndex(line => line.trim().startsWith('[intended-behavior]:'));

        if (codeStartIndex !== -1 && behaviorIndex !== -1) {
            // Extract the code (everything between [code]: and [intended-behavior]:)
            const codeLines = lines.slice(codeStartIndex, behaviorIndex);
            const firstCode = codeLines.join('\n');

            // Extract the behavior
            const firstBehavior = lines[behaviorIndex];

            // Get the complete response content (everything after [intended-behavior]:)
            const firstCompleteResponse = lines.slice(behaviorIndex + 1).join('\n');

            messages.push(
                {
                    role: "user",
                    content: `${firstCode}\n${firstBehavior}`,
                },
                {
                    role: "assistant",
                    content: firstCompleteResponse, // Use the complete response
                }
            );
        }

        // Process subsequent follow-up messages
        for (let i = 1; i < prevResponses.length; i++) {
            if (prevResponses[i]) {
                const responseLines = prevResponses[i].split('\n');

                // Find the follow-up code and behavior lines
                const followUpCodeIndex = responseLines.findIndex(line =>
                    line.trim().startsWith('[follow-up-code]:')
                );
                const followUpBehaviorIndex = responseLines.findIndex(line =>
                    line.trim().startsWith('[intended-behavior]:')
                );

                if (followUpCodeIndex !== -1 && followUpBehaviorIndex !== -1) {
                    // Extract the follow-up code and behavior
                    const followUpCodeLines = responseLines.slice(followUpCodeIndex, followUpBehaviorIndex);
                    const followUpCode = followUpCodeLines.join('\n');
                    const followUpBehavior = responseLines[followUpBehaviorIndex];

                    // Get everything after the behavior line as the complete response
                    const completeResponse = responseLines.slice(followUpBehaviorIndex + 1).join('\n');

                    messages.push(
                        {
                            role: "user",
                            content: `${followUpCode}\n${followUpBehavior}`,
                        },
                        {
                            role: "assistant",
                            content: completeResponse, // Use complete response
                        }
                    );
                }
            }
        }
    }

    // Add the current follow-up code fix request
    messages.push({
        role: "user",
        content: `[follow-up-code]:
  ${newCode}
  [intended-behavior]: ${newBehavior}`,
    });

    return {
        messages,
        stop: ["[STOP-end-fixed-code-STOP]"],
        temperature: 0.15,
        max_tokens: 2048,
    };
};