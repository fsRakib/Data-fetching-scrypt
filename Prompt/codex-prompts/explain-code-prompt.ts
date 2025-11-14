// Define our own ChatCompletionRequestMessage interface
interface ChatCompletionRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}


export const mainExplainCode = (code: string, question?: string) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        "Provide a clear [explanation] of the given code's purpose and functionality, then display the [annotated-code] with detailed line-by-line comments explaining what each part does. Focus on helping users understand C/C++ programming concepts, syntax, and best practices.",
    },
    {
      role: "user",
      content: `[code]:
nice code in another language except c/c++
[question]: Explain the code`,

    },
    {
      role: "assistant",
      content: `[answer]: Sorry, I can only provide code examples in C or C++ programming languages.`,
    },
    {
      role: "user",
      content: `[code]:
#include <unistd.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <sys/socket.h>

#include "socket.h"

void write_random_pieces(int soc, const char *message, int times) {
    char piece[MAXCHARS];
    int message_len = strlen(message);
    int total_bytes = times * message_len;
    int current_byte = 0;

    while (current_byte < total_bytes) {
        int piece_size = rand() % (MAXCHARS - MINCHARS + 1) + MINCHARS;
        int bytes_left = total_bytes - current_byte;
        if (piece_size > bytes_left) {
            piece_size = bytes_left;
        }

        for (int i = 0; i < piece_size; i++) {
            piece[i] = message[(current_byte + i) % message_len];
        }
        write(soc, piece, piece_size);
        current_byte += piece_size;
    }
}`,
    },
    {
      role: "assistant",
      content: `[answer]: This code defines a function that generates a random message by repeatedly writing pieces of the input message to a socket with random piece sizes. It selects a random piece size between \`MINCHARS\` and \`MAXCHARS\` and writes that many characters to the socket until the total number of bytes sent is equal to the length of the input message multiplied by \`times\`. If the random piece size is larger than the number of bytes remaining to be sent, the function adjusts the piece size to ensure that the entire message is sent. The function uses modulo arithmetic to loop back to the beginning of the message when the end is reached.
[code]:
[code-title]: Annotated C Code for Writing Random Pieces to a Socket
#include <unistd.h> // \`unistd.h\` is needed for \`write()\`
#include <arpa/inet.h> // \`arpa/inet.h\` is needed for \`inet_addr()\`
#include <netdb.h> // \`netdb.h\` is needed for \`gethostbyname()\`
#include <sys/socket.h> // \`sys/socket.h\` is needed for \`socket()\`

#include "socket.h" // \`socket.h\` is probably a local header file that contains the function declaration for the \`write_random_pieces()\` function below

void write_random_pieces(int soc, const char *message, int times) { // the function takes three arguments: a socket, a string, and an integer
    char piece[MAXCHARS]; // declares a character array of size \`MAXCHARS\` to store the message
    int message_len = strlen(message); // stores the length of the message in \`message_len\`
    int total_bytes = times * message_len; // stores the total number of bytes to be sent in \`total_bytes\`
    int current_byte = 0; // stores the number of bytes that have been sent in \`current_byte\`

    while (current_byte < total_bytes) { // iterates until all the bytes have been sent
        int piece_size = rand() % (MAXCHARS - MINCHARS + 1) + MINCHARS; // generates a random number between \`MINCHARS\` and \`MAXCHARS\` to determine the size of the message to be sent
        int bytes_left = total_bytes - current_byte; // stores the number of bytes left to be sent in a variable
        if (piece_size > bytes_left) { // if the size of the message to be sent is greater than the number of bytes left to be sent (which can happen if the random number generated is close to \`MAXCHARS\`)
            piece_size = bytes_left; // sets the size of the message to be sent to the number of bytes left to be sent
        }

        for (int i = 0; i < piece_size; i++) { // iterates through each character in the message to be sent to the socket
            piece[i] = message[(current_byte + i) % message_len]; // sets the character in the message to be sent to the socket to the character in the original message at the same position
        }
        write(soc, piece, piece_size); // sends the message to the socket
        current_byte += piece_size; // increments the number of bytes that have been sent
    }
}
[end-code]
[STOP-end-explain-code-STOP]`,
    },
  ];

  if (question) {
    messages.push({
      role: "user",
      content: `[code]:
${code}
[question]: ${question}`,
    });
  } else {
    messages.push({
      role: "user",
      content: `[code]:
${code}`,
    });
  }

  return {
    messages,
    stop: ["[STOP-end-explain-code-STOP]"],
    temperature: 0.1,
    max_tokens: 1536,
  };
};

export const replyExplainCode = (
  code: string,
  prevResponses: string[] | undefined,
  newQuestion: string
) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        "Answer follow-up questions about the previously explained and annotated code. Provide clear, educational explanations that help users understand C/C++ concepts, syntax, and best practices. When appropriate, include code examples to illustrate your points.",
    },
    {
      role: "user",
      content: `[code]:
void read_bitmap_metadata(FILE *image, int *pixel_array_offset, int *width, int *height) { // the function takes four arguments: a file pointer, and three pointers to integers
    fseek(image, 10, SEEK_SET); // sets the file pointer to the 10th byte in the file
    if (fread(pixel_array_offset, 4, 1, image) == 0) { // reads 4 bytes from the file and stores them in the \`pixel_array_offset\` pointer
        perror("fread"); // prints an error message if the read fails
        exit(1); // exits the program
    }

    fseek(image, 18, SEEK_SET); // sets the file pointer to the 18th byte in the file
    if (fread(width, 4, 1, image) == 0) { // reads 4 bytes from the file and stores them in the \`width\` pointer
        perror("fread"); // prints an error message if the read fails
        exit(1); // exits the program
    }
    if (fread(height, 4, 1, image) == 0) { // reads 4 bytes from the file and stores them in the \`height\` pointer
        perror("fread"); // prints an error message if the read fails
        exit(1); // exits the program
    }
}
[question]: what does SEEK_SET do?`,
    },
    {
      role: "assistant",
      content: `[answer]: \`SEEK_SET\` is a constant defined in the \`stdio.h\` header file that specifies the reference position used by the \`fseek()\` function to set the file position indicator. Specifically, \`SEEK_SET\` sets the position relative to the beginning of the file. In the provided code, \`fseek()\` is used to set the file pointer to a specific position in the file (10 and 18 bytes from the beginning of the file, respectively), so that the appropriate data can be read from the file using \`fread()\`.`,
    },
    {
      role: "user",
      content: `[follow-up-question]: show me an example of different ways to use \`fseek()\` to set the file position indicator`,
    },
    {
      role: "assistant",
      content: `[answer]: \`fseek()\` can be used with three different constants to set the file position indicator to different positions in the file. The constants are \`SEEK_SET\`, \`SEEK_CUR\`, and \`SEEK_END\`. \`SEEK_SET\` sets the position relative to the beginning of the file, \`SEEK_CUR\` sets the position relative to the current position of the file position indicator, and \`SEEK_END\` sets the position relative to the end of the file.
[code]:
[code-title]: reading file contents using fseek and ftell
#include <stdio.h>
#include <stdlib.h>

int main() {
    FILE *f = fopen("test.txt", "r");
    fseek(f, 0, SEEK_END);
    long int len = ftell(f);
    
    fseek(f, 0, SEEK_SET);
    char *buf = (char *) malloc(len);
    fread(buf, 1, len, f);
    
    fclose(f);
    printf("%s", buf);
    free(buf);

    return 0;
}
[end-code]
[STOP-end-question-answer-STOP]`,
    },
  ];

// Store the original code that should be used consistently
  let originalCode = code;
  let lastAnnotatedCode = code;

  if (prevResponses !== undefined && prevResponses.length !== 0) {
    // Process the first message
    const firstResponse = prevResponses[0];
    
    // Extract question and complete response properly
    let firstQuestion = "";
    let firstCompleteResponse = "";
    
    // Look for [question]: pattern in the response
    const questionMatch = firstResponse.match(/\[question\]:\s*([\s\S]+?)(?=\n\[|\n$|$)/);
    if (questionMatch) {
      firstQuestion = questionMatch[1].trim();
    }
    
    // Extract the original code from the first response if it exists
    const codeStartIndex = firstResponse.indexOf('[code]:');
    if (codeStartIndex !== -1) {
      const afterCodeTag = firstResponse.substring(codeStartIndex + 7); // 7 = length of '[code]:'
      const questionStartIndex = afterCodeTag.indexOf('[question]:');
      if (questionStartIndex !== -1) {
        originalCode = afterCodeTag.substring(0, questionStartIndex).trim();
      }
    }
    
    // Get everything after the question as the complete response
    const questionIndex = firstResponse.indexOf(`[question]: ${firstQuestion}`);
    if (questionIndex !== -1) {
      const afterQuestion = firstResponse.substring(questionIndex + `[question]: ${firstQuestion}`.length);
      firstCompleteResponse = afterQuestion.trim();
    } else {
      // Fallback: look for patterns like [explanation]: or [answer]:
      const explanationMatch = firstResponse.match(/\[(?:explanation|answer)\]:([\s\S]*)/);
      if (explanationMatch) {
        firstCompleteResponse = explanationMatch[0]; // Include the tag
      }
    }

    // Extract annotated code from the first response if it exists
    const annotatedCodeMatch = firstCompleteResponse.match(/\[annotated-code|code\]:\s*[\s\S]*?\n([\s\S]*?)\[end-code\]/);
    if (annotatedCodeMatch) {
      lastAnnotatedCode = annotatedCodeMatch[1].trim();
    }

    // Add the first question-response pair
    if (firstQuestion && firstCompleteResponse) {
      messages.push(
        {
          role: "user",
          content: `[code]:\n${originalCode}\n[question]: ${firstQuestion}`,
        },
        {
          role: "assistant",
          content: firstCompleteResponse,
        }
      );
    }

    // Process subsequent follow-up messages
    for (let i = 1; i < prevResponses.length; i++) {
      if (prevResponses[i]) {
        const response = prevResponses[i];
        
        // Look for follow-up question pattern
        const followUpMatch = response.match(/\[follow-up-question\]:\s*([\s\S]+?)(?=\n\[|\n$|$)/);
        
        if (followUpMatch) {
          const question = followUpMatch[1].trim();
          
          // Get everything after the follow-up question as the complete response
          const questionIndex = response.indexOf(`[follow-up-question]: ${question}`);
          if (questionIndex !== -1) {
            const afterQuestion = response.substring(questionIndex + `[follow-up-question]: ${question}`.length);
            const completeResponse = afterQuestion.trim();

            // Use the most recent annotated code for follow-up questions
            messages.push(
              {
                role: "user",
                content: `[follow-up-code]:\n${lastAnnotatedCode}\n[follow-up-question]: ${question}`,
              },
              {
                role: "assistant",
                content: completeResponse,
              }
            );
          }
        }
      }
    }
  }

  // Use the most recent annotated code for the new follow-up question
  messages.push({
    role: "user",
    content: `[follow-up-question]: ${newQuestion}`,
  });

  return {
    messages,
    stop: ["[STOP-end-question-answer-STOP]"],
    temperature: 0.15,
    max_tokens: 1536,
  };
};