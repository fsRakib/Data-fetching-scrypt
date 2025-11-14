import pandas as pd
import asyncio
import os
from typing import List, Literal
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

SEPARATOR = "---SEPARATOR-@@@---"

# Initialize OpenAI client with API key from environment variable
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def get_cot_prompt(question_type: str) -> str:
    """
    Returns the Chain-of-Thought (COT) system prompt for the given question type.
    Uses the same structure as the existing system but removes few-shot examples
    and adds Chain-of-Thought reasoning instruction.
    """
    
    # Base system prompt (same as in llm.ts)
    base_prompt = """You are a helpful AI assistant for programming education specializing in C and C++ programming languages. Provide clear, comprehensive explanations with practical examples.

CORE REQUIREMENTS:
1. Language Restriction: Only provide code examples in C or C++ programming languages
2. Relevance Check: Only answer programming-related questions
3. Educational Focus: Help students understand underlying concepts, not just provide solutions

RESPONSE STRUCTURE:
Your response must follow this exact format:
[answer]: Your detailed explanation here...

CODE OUTPUT PREFERENCE: COMPLETE CODE EXAMPLES
- Provide complete, working code examples in C or C++ 
- Use proper syntax and follow best practices
- Include detailed comments explaining each section
- Format: [code]: [code-title]: Descriptive title // Complete working code with comments [end-code]
- Ensure code is compilable and follows good programming standards"""

    # Question type specific instructions
    question_type_instructions = {
        "GeneralQuestion": """

QUESTION TYPE HANDLING:
- Type: General Programming Concepts
- Focus: Provide comprehensive theoretical explanations
- Include: Definitions, concepts, best practices, and examples
- Explain: Why concepts are important and when to use them""",

        "HelpWriteCode": """

QUESTION TYPE HANDLING:
- Type: Code Writing from Scratch
- Focus: Provide complete, well-structured solutions
- Include: Step-by-step approach to solving the problem
- Explain: Design decisions, algorithm choices, and implementation details
- Follow: Best practices and coding standards""",

        "HelpFixCode": """

QUESTION TYPE HANDLING:
- Type: Code Debugging and Fixing
- Focus: Identify issues and provide corrections
- Include: Clear explanation of what's wrong and why
- Format corrected code as: [fixed-code]: // Your corrected code here [end-fixed-code]
- Explain: The debugging process and how to avoid similar issues""",

        "CodeExplanation": """

QUESTION TYPE HANDLING:
- Type: Code Explanation Request
- Focus: Break down code step-by-step
- Include: Line-by-line or section-by-section analysis
- Explain: Execution flow, purpose of each part, and programming concepts used
- Help students build a mental model of code execution""",

        "QuestionFromCode": """

QUESTION TYPE HANDLING:
- Type: Questions About Existing Code
- Focus: Analyze and explain the provided code
- Include: Direct references to specific code parts
- Explain: How the code works and why it's written that way"""
    }

    # Closing format
    closing_format = """

MANDATORY CLOSING FORMAT:
# Every response MUST end with these two lines:
# Topics covered: concept1, concept2, concept3, concept4, concept5, concept6;
# Probable Question Type: [DeterminedQuestionType]

# QUESTION TYPE CLASSIFICATION:
# Based on your response content, classify it as one of these types:
# - GeneralQuestion: If you explained theoretical programming concepts, definitions, or general knowledge
# - QuestionFromCode: If you analyzed or answered questions about specific existing code
# - CodeExplanation: If you provided step-by-step breakdown of how code works
# - HelpFixCode: If you identified and corrected code issues or bugs
# - HelpWriteCode: If you created new code from scratch to solve a problem

# Choose the type that best matches what you actually provided in your response, not what was initially requested.

ERROR RESPONSES:
- For non-programming questions: "Sorry, this is an irrelevant question. Please ask questions related to programming."
- For non-C/C++ code requests: "Sorry, I can only provide code examples in C or C++ programming languages."

QUALITY STANDARDS:
- Be thorough but concise
- Use clear, educational language appropriate for students
- Provide practical insights that help with learning
- Ensure accuracy in all technical details
- Make explanations progressive (simple to complex when needed)

CHAIN-OF-THOUGHT REASONING:
When answering, think step by step. Break down your reasoning process clearly before providing the final answer."""

    # Combine to create the full prompt
    question_instruction = question_type_instructions.get(
        question_type, 
        question_type_instructions["GeneralQuestion"]
    )
    
    return base_prompt + question_instruction + closing_format


# ==============================
# 🧠 Async LLM call function
# ==============================
async def get_response(user_input: str, question_type: str) -> str:
    """
    Generates a response from GPT-4o using the appropriate COT prompt.
    
    Args:
        user_input: The first user message from the session
        question_type: The question type (e.g., "GeneralQuestion", "HelpWriteCode")
    
    Returns:
        The assistant's response string
    """
    if not isinstance(user_input, str) or user_input.strip() == "":
        return "INVALID INPUT: No user input provided."
    
    # Get the appropriate COT prompt for this question type
    cot_prompt = get_cot_prompt(question_type)
    
    # Add "Let's think step by step" instruction to the user message
    user_message_with_cot = f"{user_input}\n\nLet's think step by step."
    
    try:
        # Make actual OpenAI API call
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": cot_prompt},
                {"role": "user", "content": user_message_with_cot}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"ERROR: {type(e).__name__} - {str(e)}"


# ==============================
# ⚙️ Configuration
# ==============================
INPUT_FILE = r"d:\Data fetching scrypt\data(5).xlsx"
OUTPUT_FILE = r"d:\Data fetching scrypt\System_B_Response\system_B_response.xlsx"

# Model to use for all requests
MODEL = "gpt-4o"


# ==============================
# 🚀 Main processing function
# ==============================
async def main():
    # STEP 1: Load data
    print(f"Loading data from {INPUT_FILE} ...")
    df = pd.read_excel(INPUT_FILE)
    print(f"Loaded {len(df)} rows.")

    # STEP 2: Prepare data
    rows = df.to_dict(orient="records")
    results = []
    
    print(f"\nProcessing {len(rows)} sessions with GPT-4o and COT prompts (serially)...")
    
    # STEP 3: Process each row serially (one at a time)
    for i, row in enumerate(rows, 1):
        user_input = row["user_messages"]
        question_type = row["question_type"]
        
        print(f"  [{i}/{len(rows)}] Processing question type: {question_type}...")
        
        # Get response for this row
        response = await get_response(user_input, question_type)
        results.append(response)
        
        # Store response in row
        row["gpt-4o_COT"] = response
        
        # Show preview of response
        preview = response[:100].replace('\n', ' ') if len(response) > 100 else response.replace('\n', ' ')
        print(f"      ✓ Got response: {preview}...")

    print(f"\n✅ Completed {len(rows)} responses for GPT-4o with COT prompts")

    # STEP 4: Save results
    df_output = pd.DataFrame(rows)
    df_output.to_excel(OUTPUT_FILE, index=False)
    print(f"\n🎉 All responses saved to {OUTPUT_FILE}")


# ==============================
# 🏁 Entry point
# ==============================
if __name__ == "__main__":
    asyncio.run(main())
