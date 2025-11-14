// Define our own ChatCompletionRequestMessage interface
interface ChatCompletionRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}


export const mainWriteCode = (question: string) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        `focus on implementing c/c++ programming code. for each [question] below, implement the c/c++ programming code. first provide a high-level [answer], then provide the c/c++ programming code.`,
    },
    {
      role: "user",
      content: `[question]: what is the meaning of life?`,
    },
    {
      role: "assistant",
      content: `[answer]: Sorry, this is an irrelevant question. Please ask questions related to programming..
[STOP-end-question-answer-STOP]`,
    },
    {
      role: "user",
      content: `[question]: the fib function generates the first n values in the Fibonacci sequence, stores them in a dynamically-allocated array, and returns them through a pointer parameter passed as the first argument. call fib using argc and argv in the main function.`,
    },
    {
      role: "assistant",
      content: `[answer]: to define the \`fib\` function, we need to pass in a pointer to an array of integers (which itself is a pointer) and the number of values to generate. Then, we need to dynamically allocate memory for the array using \`malloc\`. Next, we need to initialize the first two values in the array to 0 and 1. Make sure to check for the edge case in which n is less than 2 (in which case we can just return the array). Finally, we need to use a for loop to generate the remaining values in the array. The fibonacci sequence is defined as the sum of the previous two values in the sequence. Therefore, we can use the previous two values in the array to generate the next value in the array. Once we have generated the first n values in the array, we can return the array through the pointer parameter.
[code]:
[code-title]: define the function
void fib(int **arr, int n) {
    *arr = (int *)malloc(n * sizeof(int));

    if (n < 2) {
        return;
    }

    (*arr)[0] = 0;
    (*arr)[1] = 1;

    for (int i = 2; i < n; i++) {
        (*arr)[i] = (*arr)[i - 1] + (*arr)[i - 2];
    }
}

[code-title]: call the function in main using values from argc and argv
int main(int argc, char *argv[]) {
    int n = atoi(argv[1]);
    int *arr;
    fib(&arr, n);
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    free(arr);
    return 0;
}
[end-code]
[STOP-end-question-answer-STOP]`,
    },
    {
      role: "user",
      content: `[question]: ${question}`,
    },
  ];

  return {
    messages,
    stop: ["[STOP-end-question-answer-STOP]"],
    temperature: 0.1,
    max_tokens: 2048,
  };
};


export const replyWriteCode = (
  prevResponses: string[] | undefined,
  newQuestion: string
) => {
  const messages: Array<ChatCompletionRequestMessage> = [
    {
      role: "system",
      content:
        "focus on implementing c/c++ programming code. for each [question] below, implement the c/c++ programming code. first provide a high-level [answer], then provide the c/c++ programming code.",
    },
    {
      role: "user",
      content: `[question]: a linked list using structs:`,
    },
    {
      role: "assistant",
      content: `[answer]: to implement a linked list, we need to define a \`struct\` that contains the data and a pointer to the next node in the list. Then, we need to create a head node that points to the first node in the list. The head node should be a pointer to a node struct. Next, we need to dynamically allocate memory for a new node (including the data and the next pointer) using \`malloc\`. Then, we need to initialize the data and next fields of the new node. Finally, we need to traverse the list to find the last node and add the new node to the end. To traverse the list, we need to create a current pointer that points to the head node. Then, we can use a while loop to traverse the list until we reach the last node. In the while loop, we can update the current pointer to point to the next node in the list. Once we reach the last node, we can set the next field of the last node to point to the new node.
[code]:
[code-title]: define the structure of a node that contains the data and a pointer to the next node.
struct node {
    int data;
    struct node *next;
};

[code-title]: create a head node that points to the first node in the list.
struct node *head = NULL;

[code-title]: dynamically allocate memory for a new node
struct node *new_node = (struct node *)malloc(sizeof(struct node));

[code-title]: initialize the data and next fields of the new node
new_node->data = 1;
new_node->next = NULL;

[code-title]: traverse the list to find the last node and add the new node to the end
struct node *current = head;
while (current->next != NULL) {
    current = current->next;
}
current->next = new_node;
[end-code]
[STOP-end-question-answer-STOP]`,
    },
    {
      role: "user",
      content: `[follow-up-question]: write a function that would get a list of integers (as a pointer) and returns a linked list of the same integers.`,
    },
    {
      role: "assistant",
      content: `[answer]: to write a function that would get a list of integers (as a pointer) and returns a linked list of the same integers, we need to define a function that takes in an array of integers and the number of integers in the array. Then, we need to dynamically allocate memory for a new node using \`malloc\`. Next, we need to initialize the data field of the new node to the first value in the array. Then, we need to create a head node that points to the first node in the list. The head node should be a pointer to a node struct. Finally, we need to use a for loop to generate the remaining values in the array. In the for loop, we need to dynamically allocate memory for a new node using \`malloc\`. Then, we need to initialize the data field of the new node to the next value in the array. Next, we need to traverse the list to find the last node and add the new node to the end. To traverse the list, we need to create a current pointer that points to the head node. Then, we can use a while loop to traverse the list until we reach the last node. In the while loop, we can update the current pointer to point to the next node in the list. Once we reach the last node, we can set the next field of the last node to point to the new node.
[code]:
[code-title]: define the function listify
struct node *listify(int *arr, int n) {
    struct node *head = NULL;
    for (int i = 0; i < n; i++) {
        struct node *new_node = (struct node *)malloc(sizeof(struct node));
        new_node->data = arr[i];
        new_node->next = NULL;
        if (head == NULL) {
            head = new_node;
        } else {
            struct node *current = head;

            while (current->next != NULL) {
                current = current->next;
            }
            current->next = new_node;
        }
    }
    return head;
}

[code-title]: call the function from main
int main() {
    int arr[] = {1, 2, 3, 4, 5};
    struct node *head = listify(arr, 5);
    struct node *current = head;
    while (current != NULL) {
        printf("%d ", current->data);
        current = current->next;
    }
    return 0;
}
[end-code]
[STOP-end-question-answer-STOP]`,
    },
  ];

  if (prevResponses !== undefined && prevResponses.length !== 0) {
    // Process responses in reverse order to maintain the latest code logic
    const processedMessages = [];
    
    // Process responses backwards (like the original)
    for (let i = prevResponses.length - 1; i >= 0; i--) {
      if (prevResponses[i]) {
        const response = prevResponses[i];
        const lines = response.split('\n');

        // Check if this is the first question or a follow-up
        const startWithQuestion = lines.filter((line) =>
          line.startsWith("[question]:")
        );

        if (startWithQuestion.length > 0) {
          // This is the first question
          const question = startWithQuestion[0].replace("[question]: ", "");
          
          // Get the complete response content (everything after the first line)
          const completeResponse = lines.slice(1).join('\n');

          processedMessages.unshift(
            {
              role: "user" as const,
              content: `[question]: ${question}`,
            },
            {
              role: "assistant" as const,
              content: completeResponse, // Use complete response
            }
          );
        } else {
          // This is a follow-up question
          const questionLine = lines.find(line => 
            line.startsWith('[follow-up-question]:')
          );
          
          if (questionLine) {
            const question = questionLine.replace('[follow-up-question]: ', '');
            
            // Get everything after the question line as the complete response
            const questionIndex = lines.indexOf(questionLine);
            const completeResponse = lines.slice(questionIndex + 1).join('\n');

            processedMessages.unshift(
              {
                role: "user" as const,
                content: `[follow-up-question]: ${question}`,
              },
              {
                role: "assistant" as const,
                content: completeResponse, // Use complete response
              }
            );
          }
        }
      }
    }

    // Add processed messages to the main messages array
    messages.push(...processedMessages);
  }

  messages.push({
    role: "user",
    content: `[follow-up-question]: ${newQuestion}`,
  });

  return {
    messages,
    stop: ["[STOP-end-question-answer-STOP]"],
    temperature: 0.1,
    max_tokens: 2048,
  };
};