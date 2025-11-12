from pymongo import MongoClient
import pandas as pd
import json

# 1️⃣ Connect to MongoDB Atlas
uri = "mongodb+srv://fsRakib:admin@cluster0.jvhnefp.mongodb.net/?appName=Cluster0"
client = MongoClient(uri)

# 2️⃣ Prefer the standard DB name but check for a likely-typo DB too
candidate_dbs = ["Effective_Learning_db", "Eeffective_Learning_db"]
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
	# fallback: use the first DB and collection even if empty
	used_db = candidate_dbs[0]
	collection = client[used_db]['sessions']

print(f"Using DB: {used_db}")
count = collection.count_documents({})
print(f"Found {count} documents in 'sessions'.")

# 3️⃣ Fetch data
data = list(collection.find())

if len(data) == 0:
	print("No documents to export. Exiting.")
else:
	# 4️⃣ Restructure data: each row = one user-assistant message pair
	rows = []
	for session in data:
		session_id = session.get('sessionId', '')
		messages = session.get('messages', [])
		
		# Group messages into user-assistant pairs
		i = 0
		while i < len(messages):
			user_msg = None
			assistant_msg = None
			
			# Find next user message
			if i < len(messages) and messages[i].get('role') == 'user':
				user_msg = messages[i]
				i += 1
			
			# Find corresponding assistant message
			if i < len(messages) and messages[i].get('role') == 'assistant':
				assistant_msg = messages[i]
				i += 1
			
			# Create row only if we have at least a user or assistant message
			if user_msg or assistant_msg:
				# Combine code and content for user message
				user_combined = ''
				if user_msg:
					code = user_msg.get('codeContent', '')
					content = user_msg.get('content', '')
					if code and content:
						user_combined = f"{code}\n{content}"
					elif code:
						user_combined = code
					else:
						user_combined = content
				
				row = {
					'sessionId': session_id,
					'questionType': user_msg.get('questionType', '') if user_msg else '',
					'user_content': user_combined,
					'assistant_content': assistant_msg.get('content', '') if assistant_msg else '',
					'assistant_codeContent': assistant_msg.get('codeContent', '') if assistant_msg else '',
				}
				rows.append(row)
	
	df = pd.DataFrame(rows)
	
	# 5️⃣ Save to Excel
	try:
		df.to_excel("sessions_data.xlsx", index=False)
		print("✅ Exported to sessions_data.xlsx")
		print(f"   {len(rows)} user-assistant message pairs exported.")
	except PermissionError:
		# file might be open in Excel or locked; write a timestamped fallback filename
		from datetime import datetime
		fallback = f"sessions_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
		df.to_excel(fallback, index=False)
		print(f"⚠️ sessions_data.xlsx was locked. Exported to {fallback} instead.")
		print(f"   {len(rows)} user-assistant message pairs exported.")
