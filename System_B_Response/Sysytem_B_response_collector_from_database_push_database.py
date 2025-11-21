import pandas as pd
import asyncio
import os
from typing import List, Literal, Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

SEPARATOR = "---SEPARATOR-@@@---"

# Validate required environment variables
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables. Check your .env file")

# Initialize OpenAI client with API key from environment variable
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Initialize MongoDB client
MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in environment variables. Check your .env file")

try:
    mongo_client = MongoClient(MONGODB_URI)
    # Test connection
    mongo_client.admin.command('ping')
except Exception as e:
    raise ConnectionError(f"MongoDB connection failed: {e}")

# MongoDB Database and Collections
DB_NAME = "Eeffective_Learning_db"
SESSIONS_COLLECTION = "sessions"
SYSTEM_B_COLLECTION = "systembresponses"


def get_cot_prompt(question_type: str, code_output_preference: str = "WithCode") -> str:
    """
    Returns the Chain-of-Thought (COT) system prompt for the given question type.
    Uses the same structure as the existing system but removes few-shot examples
    and adds Chain-of-Thought reasoning instruction.
    
    Args:
        question_type: Type of question (GeneralQuestion, HelpWriteCode, etc.)
        code_output_preference: User's preference - "NoCode", "PseudoCode", or "WithCode"
    """
    
    # Base system prompt (same as in llm.ts)
    base_prompt = """You are a helpful AI assistant for programming education specializing in C and C++ programming languages. Provide clear, comprehensive explanations with practical examples.

CORE REQUIREMENTS:
1. Language Restriction: Only provide code examples in C or C++ programming languages
2. Relevance Check: Only answer programming-related questions
3. Educational Focus: Help students understand underlying concepts, not just provide solutions

MANDATORY RESPONSE STRUCTURE:
Every response MUST start with:
[answer]: Your detailed explanation here...

This [answer] tag is REQUIRED for UI parsing. Never skip it.

CODE FORMATTING (when code is needed):
- Use this EXACT format for all code examples:
  [code]: [code-title]: Descriptive Title
  // Your complete working code here with comments
  [end-code]
- The [code-title] tag is REQUIRED for UI parsing
- Provide complete, compilable C or C++ code
- Include detailed comments explaining each section
- Follow best practices and good programming standards"""

    # Question type specific instructions
    question_type_instructions = {
        "GeneralQuestion": """

QUESTION TYPE HANDLING:
- Type: General Programming Concepts
- Focus: Provide comprehensive theoretical explanations
- Include: Definitions, concepts, best practices, and examples
- Explain: Why concepts are important and when to use them
- ALWAYS start response with [answer]: tag""",

        "HelpWriteCode": """

QUESTION TYPE HANDLING:
- Type: Code Writing from Scratch
- Focus: Provide complete, well-structured solutions
- Include: Step-by-step approach to solving the problem
- Explain: Design decisions, algorithm choices, and implementation details
- Follow: Best practices and coding standards
- ALWAYS start response with [answer]: tag
- Use [code]: [code-title]: format for all code blocks""",

        "HelpFixCode": """

QUESTION TYPE HANDLING:
- Type: Code Debugging and Fixing
- Focus: Identify issues and provide corrections
- Include: Clear explanation of what's wrong and why
- Format corrected code as: [code]: [code-title]: Fixed Code\n// Your corrected code here\n[end-code]
- Explain: The debugging process and how to avoid similar issues
- ALWAYS start response with [answer]: tag
- Use [code]: [code-title]: format for all code blocks""",

        "CodeExplanation": """

QUESTION TYPE HANDLING:
- Type: Code Explanation Request
- Focus: Break down code step-by-step
- Include: Line-by-line or section-by-section analysis
- Explain: Execution flow, purpose of each part, and programming concepts used
- Help students build a mental model of code execution
- ALWAYS start response with [answer]: tag""",

        "QuestionFromCode": """

QUESTION TYPE HANDLING:
- Type: Questions About Existing Code
- Focus: Analyze and explain the provided code
- Include: Direct references to specific code parts
- Explain: How the code works and why it's written that way
- ALWAYS start response with [answer]: tag"""
    }

    # Code output preference handling
    code_preference_instructions = {
        "NoCode": """

CODE OUTPUT PREFERENCE: NO CODE
- The user prefers explanations WITHOUT code examples
- Focus on conceptual explanations, theory, and descriptions
- Do NOT provide any code examples
- Explain concepts using natural language and analogies
- If asked to write/fix code, explain the approach conceptually instead""",
        
        "PseudoCode": """

CODE OUTPUT PREFERENCE: PSEUDO CODE
- The user prefers PSEUDO CODE instead of actual C/C++ syntax
- Provide algorithm logic in simplified, language-agnostic pseudo code
- Use clear, readable pseudo code format
- Format as: [code]: [code-title]: Algorithm Name\nYour pseudo code here\n[end-code]
- Explain the logic without strict C/C++ syntax""",
        
        "WithCode": """

CODE OUTPUT PREFERENCE: COMPLETE CODE EXAMPLES
- The user wants COMPLETE working code examples in C or C++
- Provide full, compilable code with detailed comments
- Format as: [code]: [code-title]: Descriptive Title\n// Complete code here\n[end-code]
- Include all necessary headers, functions, and implementation
- Follow best practices and coding standards"""
    }
    
    code_preference = code_preference_instructions.get(code_output_preference, code_preference_instructions["WithCode"])

    # Closing format
    closing_format = """

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
- Make explanations progressive (simple to complex when needed)

CHAIN-OF-THOUGHT REASONING:
When answering, think step by step. Break down your reasoning process clearly before providing the final answer."""

    # Combine to create the full prompt
    question_instruction = question_type_instructions.get(
        question_type, 
        question_type_instructions["GeneralQuestion"]
    )
    
    return base_prompt + question_instruction + code_preference + closing_format


# ==============================
# 🧠 Async LLM call function
# ==============================
async def get_response(user_input: str, question_type: str, code_output_preference: str = "WithCode") -> str:
    """
    Generates a response from GPT-4o using the appropriate COT prompt.
    
    Args:
        user_input: The first user message from the session
        question_type: The question type (e.g., "GeneralQuestion", "HelpWriteCode")
        code_output_preference: User's code preference ("NoCode", "PseudoCode", "WithCode")
    
    Returns:
        The assistant's response string
    """
    if not isinstance(user_input, str) or user_input.strip() == "":
        return "INVALID INPUT: No user input provided."
    
    # Get the appropriate COT prompt for this question type and code preference
    cot_prompt = get_cot_prompt(question_type, code_output_preference)
    
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
# Output Excel file
OUTPUT_FILE = r"d:\Data fetching scrypt\data\system_B_responses_COT.xlsx"

# Ensure output directory exists
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

# Model to use for all requests
MODEL = "gpt-4o"

# TEST MODE: Set to a number to limit processing (e.g., 5 for first 5 sessions)
# Set to None to process all sessions
TEST_LIMIT = None  # Full processing mode


# ==============================
# 📊 MongoDB Data Fetching & Storage
# ==============================
def fetch_sessions_from_mongodb():
    """
    Fetch all sessions from MongoDB and extract first user and assistant messages (System A).
    
    Returns:
        Tuple: (processed_data, total_sessions, skipped_count)
    """
    db = mongo_client[DB_NAME]
    sessions_collection = db[SESSIONS_COLLECTION]
    
    # Fetch all sessions
    sessions = list(sessions_collection.find({}))
    
    processed_data = []
    skipped_count = 0
    
    for session in sessions:
        try:
            session_id = session.get('sessionId', str(session.get('_id')))
            messages = session.get('messages', [])
            
            # Skip if no messages
            if not messages or len(messages) < 2:
                skipped_count += 1
                continue
            
            # Find first user message and first assistant message (System A)
            first_user_msg = None
            first_assistant_msg = None
            question_type = None
            code_content = None
            code_language = None
            code_output_preference = None
            
            for msg in messages:
                role = msg.get('role')
                
                # Get first user message
                if role == 'user' and first_user_msg is None:
                    first_user_msg = msg.get('content', '')
                    question_type = msg.get('questionType', 'GeneralQuestion')
                    code_content = msg.get('codeContent')
                    code_language = msg.get('codeLanguage')
                    code_output_preference = msg.get('codeOutputPreference', 'WithCode')
                
                # Get first assistant message (System A response)
                if role == 'assistant' and first_assistant_msg is None:
                    first_assistant_msg = msg.get('content', '')
                
                # Stop if we have both
                if first_user_msg and first_assistant_msg:
                    break
            
            # Only add if we have both user and assistant messages
            if first_user_msg and first_assistant_msg:
                # Combine user message with code content if available
                full_user_message = first_user_msg
                if code_content:
                    full_user_message = f"{first_user_msg}\n\n[Code]:\n{code_content}"
                
                processed_data.append({
                    'sessionId': session_id,
                    'questionType': question_type,
                    'userMessage': full_user_message,  # Combined message + code
                    'originalUserMessage': first_user_msg,  # Keep original for reference
                    'systemAResponse': first_assistant_msg,
                    'codeContent': code_content,
                    'codeLanguage': code_language,
                    'codeOutputPreference': code_output_preference,
                    'messageIndex': 0  # Always 0 for first message
                })
            else:
                skipped_count += 1
                
        except Exception as e:
            skipped_count += 1
            continue
    
    # Apply test limit if set
    if TEST_LIMIT is not None:
        processed_data = processed_data[:TEST_LIMIT]
    
    return processed_data, len(sessions), skipped_count


def store_system_b_response_to_mongo(session_id: str, message_index: int, 
                                     user_message: str, system_b_response: str,
                                     question_type: str, code_content: str = None,
                                     code_language: str = None, 
                                     code_output_preference: str = None) -> bool:
    """
    Store System B response in MongoDB systembresponses collection.
    Follows the schema from system-b-response-model.ts
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db = mongo_client[DB_NAME]
        system_b_collection = db[SYSTEM_B_COLLECTION]
        
        # Create document following the schema
        document = {
            'sessionId': session_id,
            'messageIndex': message_index,
            'userMessage': user_message,
            'assistantResponse': system_b_response,
            'questionType': question_type,
            'codeContent': code_content,
            'codeLanguage': code_language,
            'codeOutputPreference': code_output_preference,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # Use update_one with upsert to avoid duplicates
        # The compound index (sessionId, messageIndex) ensures uniqueness
        result = system_b_collection.update_one(
            {'sessionId': session_id, 'messageIndex': message_index},
            {'$set': document},
            upsert=True
        )
        
        return True
        
    except Exception as e:
        return False


# ==============================
# 🎨 Console UI Helpers
# ==============================
def is_valid_response(response: str) -> bool:
    """
    Check if the response is valid and should be stored.
    Returns False for irrelevant questions or error responses.
    """
    if not response or not isinstance(response, str):
        return False
    
    # Check for irrelevant question response
    irrelevant_markers = [
        "Sorry, this is an irrelevant question",
    ]
    
    response_lower = response.lower()
    for marker in irrelevant_markers:
        if marker.lower() in response_lower:
            return False
    
    # Check if response is too short (likely an error)
    if len(response.strip()) < 20:
        return False
    
    return True


def print_header(text: str):
    """Print a styled header"""
    print(f"\n{'=' * 80}")
    print(f"  {text}")
    print(f"{'=' * 80}")


def print_subheader(text: str):
    """Print a styled subheader"""
    print(f"\n{text}")
    print(f"{'-' * 80}")


def print_progress(current: int, total: int, session_id: str, question_type: str):
    """Print progress in a clean format"""
    percentage = (current / total) * 100
    print(f"[{current}/{total}] ({percentage:.1f}%) | {question_type:<20} | {session_id[:30]}...")


# ==============================
# 🚀 Main processing function
# ==============================
async def main():
    print_header("SYSTEM B RESPONSE GENERATOR - CHAIN-OF-THOUGHT")
    
    # STEP 1: Fetch sessions from MongoDB
    print_subheader("Step 1: Loading Sessions from MongoDB")
    
    try:
        sessions_data, total_sessions, skipped = fetch_sessions_from_mongodb()
        
        if not sessions_data:
            print("\n❌ No valid sessions found. Exiting.")
            return
        
        # Question type distribution
        question_types = {}
        for session in sessions_data:
            qtype = session['questionType']
            question_types[qtype] = question_types.get(qtype, 0) + 1
        
        print(f"\n✓ Loaded {len(sessions_data)} valid sessions (Total: {total_sessions}, Skipped: {skipped})")
        print(f"  Question Types: {', '.join([f'{k}({v})' for k, v in question_types.items()])}")
        
        if TEST_LIMIT:
            print(f"  ⚠ TEST MODE: Processing limited to {TEST_LIMIT} sessions")
        
    except Exception as e:
        print(f"\n❌ MongoDB Error: {e}")
        return

    # STEP 2: Generate System B Responses
    print_subheader("Step 2: Generating Chain-of-Thought Responses")
    
    results_for_excel = []
    mongo_success = 0
    mongo_failed = 0
    skipped_invalid = 0
    
    for i, session_data in enumerate(sessions_data, 1):
        session_id = session_data['sessionId']
        question_type = session_data['questionType']
        user_message = session_data['userMessage']
        original_user_msg = session_data.get('originalUserMessage', user_message)
        system_a_response = session_data['systemAResponse']
        code_content = session_data.get('codeContent')
        code_language = session_data.get('codeLanguage')
        code_output_preference = session_data.get('codeOutputPreference', 'WithCode')
        message_index = session_data['messageIndex']
        
        # Show progress
        print_progress(i, len(sessions_data), session_id, question_type)
        
        # Generate System B response with user's code preference
        system_b_response = await get_response(user_message, question_type, code_output_preference)
        
        # Validate response before storing/exporting
        if not is_valid_response(system_b_response):
            skipped_invalid += 1
            print(f"  ⚠ Skipped: Invalid/Irrelevant response")
            continue

        # Store in MongoDB
        if store_system_b_response_to_mongo(
            session_id=session_id,
            message_index=message_index,
            user_message=user_message,
            system_b_response=system_b_response,
            question_type=question_type,
            code_content=code_content,
            code_language=code_language,
            code_output_preference=code_output_preference
        ):
            mongo_success += 1
        else:
            mongo_failed += 1

        # Prepare data for Excel
        results_for_excel.append({
            'sessionId': session_id,
            'questionType': question_type,
            'messageIndex': message_index,
            'userMessage': original_user_msg,
            'userCodeContent': code_content,
            'codeOutputPreference': code_output_preference,
            'fullUserInput': user_message,
            'systemAResponse': system_a_response,
            'systemBResponse_COT': system_b_response
        })

    print(f"\n✓ Generated {mongo_success} responses | Failed: {mongo_failed} | Skipped Invalid: {skipped_invalid}")

    # STEP 3: Save to Excel
    print_subheader("Step 3: Saving Results to Excel")
    
    df_output = pd.DataFrame(results_for_excel)
    df_output.to_excel(OUTPUT_FILE, index=False)
    
    file_size = os.path.getsize(OUTPUT_FILE) / 1024  # KB
    print(f"✓ Saved: {OUTPUT_FILE}")
    print(f"  Rows: {len(df_output)} | Size: {file_size:.2f} KB")
    
    # STEP 4: Verify MongoDB Storage
    print_subheader("Step 4: Verifying MongoDB Storage")
    
    db = mongo_client[DB_NAME]
    system_b_collection = db[SYSTEM_B_COLLECTION]
    total_in_db = system_b_collection.count_documents({})
    
    print(f"✓ Total documents in '{SYSTEM_B_COLLECTION}': {total_in_db}")
    
    mongo_client.close()
    
    # Final Summary
    print_header("✅ PROCESS COMPLETED SUCCESSFULLY")
    print(f"""
  📊 Summary:
     • Sessions Processed: {len(sessions_data)}
     • Valid Responses Generated: {mongo_success}
     • Invalid/Skipped: {skipped_invalid}
     • Failed: {mongo_failed}
     • Stored in MongoDB: {SYSTEM_B_COLLECTION}
     • Excel Output: {OUTPUT_FILE}
     
  🎯 Next Step: Use evaluation API to compare System A vs System B
     Endpoint: GET /api/evaluation
    """)


# ==============================
# 🏁 Entry point
# ==============================
if __name__ == "__main__":
    asyncio.run(main())
