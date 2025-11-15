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

# Initialize OpenAI client with API key from environment variable
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Initialize MongoDB client
MONGODB_URI = os.environ.get("MONGODB_URI")
mongo_client = MongoClient(MONGODB_URI)

# MongoDB Database and Collections
DB_NAME = "Eeffective_Learning_db"
SESSIONS_COLLECTION = "sessions"
SYSTEM_B_COLLECTION = "systembresponses"


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
# Output Excel file
OUTPUT_FILE = r"d:\Data fetching scrypt\data\system_B_responses_complete.xlsx"

# Model to use for all requests
MODEL = "gpt-4o"

# TEST MODE: Set to a number to limit processing (e.g., 5 for first 5 sessions)
# Set to None to process all sessions
TEST_LIMIT = 5  # Change to None for full processing


# ==============================
# 📊 MongoDB Data Fetching & Storage
# ==============================
def fetch_sessions_from_mongodb():
    """
    Fetch all sessions from MongoDB and extract first user and assistant messages (System A).
    
    Returns:
        List of dictionaries with session_id, question_type, user_message, system_a_response
    """
    print(f"Connecting to MongoDB database: {DB_NAME}")
    db = mongo_client[DB_NAME]
    sessions_collection = db[SESSIONS_COLLECTION]
    
    # Fetch all sessions
    sessions = list(sessions_collection.find({}))
    print(f"Found {len(sessions)} sessions in database")
    
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
            
            for msg in messages:
                role = msg.get('role')
                
                # Get first user message
                if role == 'user' and first_user_msg is None:
                    first_user_msg = msg.get('content', '')
                    question_type = msg.get('questionType', 'GeneralQuestion')
                    code_content = msg.get('codeContent')
                    code_language = msg.get('codeLanguage')
                
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
                    'messageIndex': 0  # Always 0 for first message
                })
            else:
                skipped_count += 1
                
        except Exception as e:
            print(f"  ⚠ Error processing session {session.get('_id')}: {e}")
            skipped_count += 1
            continue
    
    print(f"✓ Processed {len(processed_data)} valid sessions")
    if skipped_count > 0:
        print(f"⚠ Skipped {skipped_count} sessions (incomplete data)")
    
    # Apply test limit if set
    if TEST_LIMIT is not None:
        print(f"\n⚠ TEST MODE: Limiting to first {TEST_LIMIT} sessions")
        processed_data = processed_data[:TEST_LIMIT]
    
    return processed_data


def store_system_b_response_to_mongo(session_id: str, message_index: int, 
                                     user_message: str, system_b_response: str,
                                     question_type: str, code_content: str = None,
                                     code_language: str = None) -> bool:
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
        
        if result.upserted_id:
            print(f"    ✓ Inserted new System B response for session {session_id[:15]}...")
        elif result.modified_count > 0:
            print(f"    ✓ Updated existing System B response for session {session_id[:15]}...")
        
        return True
        
    except Exception as e:
        print(f"    ✗ Error storing to MongoDB: {e}")
        return False


# ==============================
# 🚀 Main processing function
# ==============================
async def main():
    print("=" * 80)
    print("SYSTEM B RESPONSE GENERATOR - COT BASED")
    print("=" * 80)
    
    # STEP 1: Fetch sessions from MongoDB
    print("\n" + "=" * 80)
    print("STEP 1: Fetching Sessions from MongoDB (System A Data)")
    print("=" * 80)
    
    try:
        sessions_data = fetch_sessions_from_mongodb()
        
        if not sessions_data:
            print("❌ No valid sessions found in database. Exiting.")
            return
        
        print(f"\n📊 Loaded {len(sessions_data)} sessions from database")
        
        # Show question type distribution
        print("\n📝 Question Type Distribution:")
        question_types = {}
        for session in sessions_data:
            qtype = session['questionType']
            question_types[qtype] = question_types.get(qtype, 0) + 1
        
        for qtype, count in question_types.items():
            print(f"   - {qtype}: {count}")
        
    except Exception as e:
        print(f"❌ Error fetching data from MongoDB: {e}")
        return

    # STEP 2: Generate System B Responses
    print(f"\n{'=' * 80}")
    print("STEP 2: Generating System B (COT) Responses")
    print("=" * 80)
    
    results_for_excel = []
    mongo_success_count = 0
    mongo_fail_count = 0
    
    print(f"\nProcessing {len(sessions_data)} sessions...")
    
    for i, session_data in enumerate(sessions_data, 1):
        session_id = session_data['sessionId']
        question_type = session_data['questionType']
        user_message = session_data['userMessage']  # This now includes code content if available
        original_user_msg = session_data.get('originalUserMessage', user_message)
        system_a_response = session_data['systemAResponse']
        code_content = session_data.get('codeContent')
        code_language = session_data.get('codeLanguage')
        message_index = session_data['messageIndex']
        
        print(f"\n{'─' * 80}")
        print(f"  [{i}/{len(sessions_data)}] Session: {session_id[:25]}...")
        print(f"  Question Type: {question_type}")
        print(f"  User Message: {original_user_msg[:60]}...")
        if code_content:
            print(f"  Has Code: Yes ({code_language or 'unknown'})")
        
        # Generate System B response using COT
        # user_message already includes code content if it exists
        print(f"  Generating System B COT response...")
        system_b_response = await get_response(user_message, question_type)
        
        # Show preview
        preview = system_b_response[:100].replace('\n', ' ') if len(system_b_response) > 100 else system_b_response.replace('\n', ' ')
        print(f"  ✓ System B Response: {preview}...")
        
        # Store in MongoDB
        print(f"  Storing to MongoDB collection: {SYSTEM_B_COLLECTION}")
        mongo_success = store_system_b_response_to_mongo(
            session_id=session_id,
            message_index=message_index,
            user_message=user_message,
            system_b_response=system_b_response,
            question_type=question_type,
            code_content=code_content,
            code_language=code_language
        )
        
        if mongo_success:
            mongo_success_count += 1
        else:
            mongo_fail_count += 1
        
        # Prepare data for Excel
        results_for_excel.append({
            'sessionId': session_id,
            'questionType': question_type,
            'messageIndex': message_index,
            'userMessage': original_user_msg,  # Original message without code
            'userCodeContent': code_content,
            'codeLanguage': code_language,
            'fullUserInput': user_message,  # Message + code (what was sent to LLM)
            'systemAResponse': system_a_response,
            'systemBResponse_COT': system_b_response
        })

    print(f"\n{'=' * 80}")
    print(f"✅ STEP 2 COMPLETE")
    print(f"   - Total processed: {len(sessions_data)}")
    print(f"   - MongoDB inserts successful: {mongo_success_count}")
    print(f"   - MongoDB inserts failed: {mongo_fail_count}")
    print("=" * 80)

    # STEP 3: Save to Excel
    print(f"\n{'=' * 80}")
    print("STEP 3: Saving Results to Excel")
    print("=" * 80)
    
    df_output = pd.DataFrame(results_for_excel)
    df_output.to_excel(OUTPUT_FILE, index=False)
    print(f"✓ Excel file saved: {OUTPUT_FILE}")
    
    # Show summary
    print(f"\n📋 Output Summary:")
    print(f"   - Total sessions: {len(df_output)}")
    print(f"   - Columns: {', '.join(df_output.columns.tolist())}")
    print(f"   - File size: {os.path.getsize(OUTPUT_FILE):,} bytes")
    
    # STEP 4: Verify MongoDB Data
    print(f"\n{'=' * 80}")
    print("STEP 4: Verifying MongoDB Storage")
    print("=" * 80)
    
    db = mongo_client[DB_NAME]
    system_b_collection = db[SYSTEM_B_COLLECTION]
    
    total_in_db = system_b_collection.count_documents({})
    print(f"✓ Total System B responses in MongoDB: {total_in_db}")
    
    # Show sample document
    sample = system_b_collection.find_one({})
    if sample:
        print(f"\n📄 Sample Document Structure:")
        print(f"   - sessionId: {sample.get('sessionId', 'N/A')[:30]}...")
        print(f"   - messageIndex: {sample.get('messageIndex', 'N/A')}")
        print(f"   - questionType: {sample.get('questionType', 'N/A')}")
        print(f"   - Has userMessage: {bool(sample.get('userMessage'))}")
        print(f"   - Has assistantResponse: {bool(sample.get('assistantResponse'))}")
        print(f"   - Has codeContent: {bool(sample.get('codeContent'))}")
    
    # Close MongoDB connection
    mongo_client.close()
    print(f"\n✓ MongoDB connection closed")
    
    print(f"\n{'=' * 80}")
    print("🎉 ALL STEPS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print(f"\n📊 Summary:")
    print(f"   1. Fetched {len(sessions_data)} sessions from MongoDB")
    print(f"   2. Generated {mongo_success_count} System B COT responses")
    print(f"   3. Stored in MongoDB collection: {SYSTEM_B_COLLECTION}")
    print(f"   4. Saved Excel file: {OUTPUT_FILE}")
    print(f"\n✅ System B responses are now ready for evaluation!")
    print(f"   They can be accessed via the evaluation API at:")
    print(f"   GET /api/evaluation")


# ==============================
# 🏁 Entry point
# ==============================
if __name__ == "__main__":
    asyncio.run(main())
