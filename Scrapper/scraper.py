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
            user_msgs = []
            assistant_msgs = []

            for msg in msgs:
                role = msg.get("role")
                content = msg.get("content", "")
                code = msg.get("codeContent", "")
                combined = f"{code}\n{content}" if code else content

                if role == "user":
                    user_msgs.append(combined)
                elif role == "assistant":
                    assistant_msgs.append(combined)

            total_messages = len(msgs)
            user_cnt = len(user_msgs)
            asst_cnt = len(assistant_msgs)

            # skip empty groups
            if total_messages == 0:
                continue

            rows.append({
                "session_id": session_id,
                "total_messages": total_messages,
                "user_message_cnt": user_cnt,
                "assistant_msg_cnt": asst_cnt,
                "question_type": qtype,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "user_messages": "---SEPARATOR-@@@---".join(user_msgs),
                "assistant_messages": "---SEPARATOR-@@@---".join(assistant_msgs),
            })

    # convert to DataFrame
    df = pd.DataFrame(rows)

    if df.empty:
        print("No valid session/questionType data found.")
    else:
        # 4️⃣ Save to Excel
        try:
            df.to_excel("sessions_by_question_type.xlsx", index=False)
            print(f"✅ Exported {len(df)} rows to sessions_by_question_type.xlsx")
        except PermissionError:
            fallback = f"sessions_by_question_type_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            df.to_excel(fallback, index=False)
            print(f"⚠️ sessions_by_question_type.xlsx locked. Exported to {fallback} instead.")