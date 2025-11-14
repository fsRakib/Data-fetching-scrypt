// Define our own ChatCompletionRequestMessage interface
interface ChatCompletionRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}


export const mainAskFromCode = (question: string, code: string) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        `for each provided [code] and asked [question] (which is asked about the [code]), provide a thorough [answer] (single-paragraph). if needed, also provide a c/c++ programming [code] example with a [code-title] and end it with [end-code]. each response should end with [end-question-answer].`,
    },
    {
      role: "user",
      content: `[code]:
nice code you got over there :)
[question]: what is the meaning of life?`,
    },
    {
      role: "assistant",
      content: `[answer]: Sorry, this is an irrelevant question. Please ask questions related to programming.
[end-question-answer]`,
    },
    {
      role: "user",
      content: `[code]: #include <stdio.h> int main() { printf("Hello, World!\n"); return 0; }
[question]: Why does this code print "Hello, World!" to the console?`,
    },
    {
      role: "assistant",
      content: "[answer]: The code prints \`Hello, World!\` to the console because it uses the \`printf\` function from the C standard library, which outputs formatted text to the standard output (usually the console). The string \`Hello, World!\n\` is passed as an argument to \`printf\`, where \`\n\` represents a newline character, causing the cursor to move to the next line after printing. The \`#include <stdio.h>\` directive includes the necessary header for \`printf\`, and the \`main\` function serves as the entry point of the program, returning 0 to indicate successful execution. [end-question-answer]",
    },
    {
      role: "user",
      content: `[code]:
void fib(int **pt, int n) {
    *pt = malloc(sizeof(int) * n);
    int *heap_pt = *pt;
    for (int i = 0; i < n ; i++) {
      if (i == 0) {
        heap_pt[0] = 0;
      } else if (i == 1) {
        heap_pt[1] = 1;
      } else {
        heap_pt[i] = heap_pt[i-1] + heap_pt[i-2];
      }
    }
}
[question]: is *heap_pt pointing to the first element of an array?`,
    },
    {
      role: "assistant",
      content: `[answer]: Yes, \`heap_pt\` is pointing to the first element of an array. In this code, \`pt\` is a double pointer to an integer, and \`heap_pt\` is a single pointer to an integer. \`malloc\` is used to allocate memory dynamically on the heap and the returned pointer is stored in \`*pt\`. Then \`heap_pt\` is assigned the value of \`*pt\`, so \`heap_pt\` is pointing to the first element of the dynamically allocated array. In the for loop, the Fibonacci sequence is calculated and stored in the dynamically allocated memory, starting from the first element, which \`heap_pt\` is pointing to.
[end-question-answer]`,
    },
    {
      role: "user",
      content: `[code]:
unsigned long fsize(char* file) {
    FILE f = fopen(file, "r");
    fseek(0, f, SEEK_END);
    long len = long(ftell(f));
    fclose(f);

    return len;
}
[question]: what's wrong with this code?`,
    },
    {
      role: "assistant",
      content: `[answer]: The code contains a number of issues that would prevent it from working as intended: 1. The \`FILE\` type should be a pointer, but it is being declared as a value in the line \`FILE f = fopen(file, "r");\`. 2. The \`fseek\` function takes the file pointer as its first argument and the offset as its second argument, but the arguments are being passed in the opposite order in the line \`fseek(0, f, SEEK_END);\`. 3. \`long\` is not a valid type in C, instead \`long int\` should be used.
[code]:
[code-title]: fixed code
unsigned long fsize(char* file) {
    FILE *f = fopen(file, "r");
    fseek(f, 0, SEEK_END);
    long int len = ftell(f);
    fclose(f);

    return len;
}
[end-code]
[end-question-answer]`,
    },
    {
      role: "user",
      content: `[code]:
${code}
[question]: ${question}`,
    },
  ];
  return {
    messages,
    stop: ["[end-question-answer]"],
    temperature: 0.3,
    max_tokens: 1024,
  };
};


export const replyAskFromCode = (
  code: string,
  prevResponses: string[] | undefined,
  newQuestion: string
) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        `for each asked [question], provide a thorough [answer] (single-paragraph). if needed, also provide a [code] example with a [code-title] and end it with [end-code]. each response should end with [end-question-answer].`,
    },
    {
      role: "user",
      content: `[code]:
unsigned long fsize(char* file) {
    FILE f = fopen(file, "r");
    fseek(0, f, SEEK_END);
    long len = long(ftell(f));
    fclose(f);

    return len;
}
[question]: what's wrong with this code?`,
    },
    {
      role: "assistant",
      content: `[answer]: The code contains a number of issues that would prevent it from working as intended: 1. The \`FILE\` type should be a pointer, but it is being declared as a value in the line \`FILE f = fopen(file, "r");\`. 2. The \`fseek\` function takes the file pointer as its first argument and the offset as its second argument, but the arguments are being passed in the opposite order in the line \`fseek(0, f, SEEK_END);\`. 3. \`long\` is not a valid type in C, instead \`long int\` should be used.
[code]:
[code-title]: fixed code
unsigned long fsize(char* file) {
    FILE *f = fopen(file, \"r\");
    fseek(f, 0, SEEK_END);
    long int len = ftell(f);
    fclose(f);
    
    return len;
}
[end-code]
[end-question-answer]`,
    },
    {
      role: "user",
      content: `[follow-up-question]: how can I use fseek and ftell properly?`,
    },
    {
      role: "assistant",
      content: `[answer]: Here's the prototype of the \`fseek\` function: \`int fseek(FILE *stream, long int offset, int whence);\`. The first argument is the file pointer, the second argument is the offset, and the third argument is the position from which the offset is measured. The third argument can be one of the following values: 1. \`SEEK_SET\` - the offset is measured from the beginning of the file 2. \`SEEK_CUR\` - the offset is measured from the current position in the file 3. \`SEEK_END\` - the offset is measured from the end of the file Here's the prototype of the \`ftell\` function: \`long int ftell(FILE *stream);\`. The \`ftell\` function returns the current position in the file, which is measured in bytes from the beginning of the file. Below is an example of how to use \`fseek\` and \`ftell\` to get the length of a file:
[code]:
[code-title]: example usage of fseek and ftell
#include <stdio.h>
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
[end-question-answer]`,
    },
  ];

  if (prevResponses && prevResponses.length !== 0) {
    // Process the first message
    const firstResponse = prevResponses[0];
    
    // Extract question from first line
    const lines = firstResponse.split('\n');
    const firstQuestion = lines[0].replace('[question]: ', '');
    
    // Get the complete response content (everything after the first line)
    const firstCompleteResponse = lines.slice(1).join('\n');
  
    messages.push(
      {
        role: "user",
        content: `[code]:\n${code}\n[question]: ${firstQuestion}`,
      },
      {
        role: "assistant",
        content: firstCompleteResponse,
      }
    );
  
    // Process subsequent follow-up messages
    for (let i = 1; i < prevResponses.length; i++) {
      if (prevResponses[i]) {
        const responseLines = prevResponses[i].split('\n');
        
        // Find the follow-up question line
        const questionLine = responseLines.find(line => 
          line.startsWith('[follow-up-question]:')
        );
        
        if (questionLine) {
          const question = questionLine.replace('[follow-up-question]: ', '');
          
          // Get everything after the question line as the complete response
          const questionIndex = responseLines.indexOf(questionLine);
          const completeResponse = responseLines.slice(questionIndex + 1).join('\n');
  
          messages.push(
            {
              role: "user",
              content: `[follow-up-question]: ${question}`,
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
  
  messages.push({
    role: "user",
    content: `[follow-up-question]: ${newQuestion}`,
  });

  return {
    messages,
    stop: ["[end-question-answer]"],
    temperature: 0.15,
    max_tokens: 1024,
  };
};