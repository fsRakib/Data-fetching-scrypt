import pandas as pd
import asyncio
from typing import List, Literal

SEPARATOR = "---SEPARATOR-@@@---"


def get_prompt(prompt_set_name: str, question_type: str) -> str:
    """
    Returns the prompt text based on the prompt set name and question type.
    Replace this with your actual prompt retrieval logic.
    """
    prompts = {
        "chain_of_thoughts_prompt": {
            "GeneralQuestion": "This is a chain-of-thoughts prompt for general questions.",
            "HelpWriteCode": "This is a chain-of-thoughts prompt for coding questions.",
            "HelpFixCode": "This is a chain-of-thoughts prompt for math questions.",
            "CodeExplanation": "This is a chain-of-thoughts prompt for code explanation questions.",
            "AskFromCode": "This is a chain-of-thoughts prompt for code understanding questions.",
        },
        "one_shot": {
            "GeneralQuestion": "This is a one-shot prompt for general questions.",
            "HelpWriteCode": "This is a one-shot prompt for coding questions.",
            "HelpFixCode": "This is a one-shot prompt for math questions.",
            "CodeExplanation": "This is a one-shot prompt for code explanation questions.",
            "AskFromCode": "This is a one-shot prompt for code understanding questions.",
        },
        "few_shot": {
            "GeneralQuestion": "This is a few-shot prompt for general questions.",
            "HelpWriteCode": "This is a few-shot prompt for coding questions.",
            "HelpFixCode": "This is a few-shot prompt for math questions.",
            "CodeExplanation": "This is a few-shot prompt for code explanation questions.",
            "AskFromCode": "This is a few-shot prompt for code understanding questions.",
        },
    }

    # Retrieve the prompt safely
    return prompts.get(prompt_set_name, {}).get(question_type, "NO PROMPT FOUND.")


# ==============================
# 🧠 Dummy async function
# ==============================
async def get_single_response(model: str, prompt_set_name: str, user_input: str, question_type: str) -> str:
    """
    Dummy async function that simulates generating a response from an LLM.
    Replace this with your actual async LLM API call (e.g., OpenAI, Gemini).
    """
    prompt = get_prompt(prompt_set_name, question_type)
    # Simulate an async LLM call with a delay
    await asyncio.sleep(0.1)
    return f"Response to: {user_input[:50]} using prompt: {prompt} and model: {model}..."


async def get_assistant_responses(model: str, prompt_set_name: str, user_input_raw: str, question_type: str) -> str:
    """
    Dummy async function that simulates generating a response from an LLM.
    Replace this with your actual async LLM API call (e.g., OpenAI, Gemini).
    return final string by joining all assistant responses with separator
    """
    if type(user_input_raw) != str or user_input_raw.strip() == "" or user_input_raw is None:
        return "INVALID CONFIGURATION: No user input provided."
    user_inputs = user_input_raw.split(SEPARATOR)
    assistant_responses = []
    for user_input in user_inputs:
        assistant_response = await get_single_response(model, prompt_set_name, user_input, question_type)
        assistant_responses.append(assistant_response)
    final_response = SEPARATOR.join(assistant_responses)
    return final_response


# ==============================
# ⚙️ Configuration
# ==============================
INPUT_FILE = "sessions_by_question_type.xlsx"
OUTPUT_FILE = "processed_sessions.xlsx"

# Model–Prompt evaluation sets
eval_sets = [
    ("gpt-4o-mini", "chain_of_thoughts_prompt"),
    ("gpt-4o-mini", "one_shot"),
    ("gpt-4o-mini", "few_shot"),
    ("gemini-1.5-flash", "chain_of_thoughts_prompt"),
    ("gemini-2.5-flash", "chain_of_thoughts_prompt"),
    ("gemini-2.5-flash", "one_shot"),
]


# ==============================
# 🚀 Main processing function
# ==============================
async def main():
    # STEP 1: Load data
    print(f"Loading data from {INPUT_FILE} ...")
    df = pd.read_excel(INPUT_FILE)
    print(f"Loaded {len(df)} rows.")

    # STEP 2: Prepare message lists
    rows = df.to_dict(orient="records")

    # STEP 3: Generate responses for each eval set
    for model, prompt_name in eval_sets:
        print(f"\nProcessing model={model}, prompt={prompt_name}")
        response_key = f"{model}__{prompt_name}"
        tasks = []

        for row in rows:
            user_input = row["user_messages"]
            question_type = row["question_type"]
            tasks.append(get_assistant_responses(model, prompt_name, user_input, question_type))

        # Run all async LLM calls concurrently for efficiency
        results: List[str] = await asyncio.gather(*tasks)

        # Store responses in rows
        for i, row in enumerate(rows):
            row[response_key] = results[i]

        print(f"✅ Completed {len(rows)} responses for {response_key}")

    # STEP 4: Save results
    df_output = pd.DataFrame(rows)
    df_output.to_excel(OUTPUT_FILE, index=False)
    print(f"\n🎉 All responses saved to {OUTPUT_FILE}")


# ==============================
# 🏁 Entry point
# ==============================
if __name__ == "__main__":
    asyncio.run(main())
