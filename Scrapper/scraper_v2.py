from pymongo import MongoClient
import pandas as pd
import json
from datetime import datetime

# 1️⃣ Connect to MongoDB Atlas
uri = "mongodb+srv://alfezafarzine:admin@cluster0.3mlf7p1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri)

# 2️⃣ Detect correct DB
candidate_dbs = ["Eeffective_Learning_db"]
collection = None
used_db = None

for db_name in candidate_dbs:
    db = client[db_name]
    try:
        cnt = db['sessions'].count_documents({})
    except Exception:
        cnt = 0
    if cnt > 0:
        collection = db['sessions']
        used_db = db_name
        break

if collection is None:
    used_db = candidate_dbs[0]
    collection = client[used_db]['sessions']

print(f"Using DB: {used_db}")
count = collection.count_documents({})
print(f"Found {count} documents in 'sessions'.")

# 3️⃣ Fetch and process sessions
data = list(collection.find())

if len(data) == 0:
    print("No documents to export. Exiting.")
else:
    rows = []

    for session in data:
        messages = session.get("messages", [])
        if not messages:
            continue  # Skip sessions with no messages

        session_id = session.get("sessionId", "")
        created_at = session.get("createdAt")
        updated_at = session.get("updatedAt")

        # group messages by questionType
        qtype_groups = {}
        for msg in messages:
            qtype = msg.get("questionType", "").strip()
            if not qtype:
                continue
            qtype_groups.setdefault(qtype, []).append(msg)

        # create separate rows for each questionType
        for qtype, msgs in qtype_groups.items():
            first_user_msg = None
            first_assistant_msg = None

            for msg in msgs:
                role = msg.get("role")
                content = msg.get("content", "")
                code = msg.get("codeContent", "")
                combined = f"{code}\n{content}" if code else content

                if role == "user" and first_user_msg is None:
                    first_user_msg = combined
                elif role == "assistant" and first_assistant_msg is None:
                    first_assistant_msg = combined

                # stop if we have both
                if first_user_msg and first_assistant_msg:
                    break

            # skip if no valid messages found
            if not first_user_msg and not first_assistant_msg:
                continue

            rows.append({
                "session_id": session_id,
                "question_type": qtype,
                "user_messages": first_user_msg or "",
                "assistant_messages": first_assistant_msg or "",
            })

    # convert to DataFrame
    df = pd.DataFrame(rows)

    if df.empty:
        print("No valid session/questionType data found.")
    else:
        # 4️⃣ Save to Excel
        try:
            df.to_excel("data.xlsx", index=False)
            print(f"✅ Exported {len(df)} rows to data.xlsx")
        except PermissionError:
            fallback = f"data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            df.to_excel(fallback, index=False)
            print(f"⚠️ data.xlsx locked. Exported to {fallback} instead.")