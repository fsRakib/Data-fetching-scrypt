# MongoDB Sessions Data Exporter

A Python script to export MongoDB session data to Excel format with user-assistant message pairs.

## Features

- Connects to MongoDB Atlas database
- Extracts session data with user-assistant message pairs
- Exports data to Excel with organized columns
- Handles locked files with timestamped fallback names
- Read-only operation - does not modify MongoDB data

## Prerequisites

- Python 3.7 or higher
- MongoDB Atlas account with database access

## Installation

1. Clone or download this project

2. Create a virtual environment (recommended):

```bash
python -m venv .venv
```

3. Activate the virtual environment:

   - Windows PowerShell:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - Windows Command Prompt:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - Linux/Mac:
     ```bash
     source .venv/bin/activate
     ```

4. Install required packages:

```bash
pip install -r requirements.txt
```

## Configuration

Edit the `mongo.py` file and update the MongoDB connection URI:

```python
uri = "mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?appName=YOUR_APP"
```

The script checks for these databases in order:

- `Effective_Learning_db`
- `Eeffective_Learning_db`

Update the `candidate_dbs` list if your database has a different name.

## Usage

Run the script:

```bash
python mongo.py
```

The script will:

1. Connect to your MongoDB Atlas database
2. Find and count documents in the 'sessions' collection
3. Export data to `sessions_data.xlsx`
4. If the file is locked, it creates a timestamped file instead

## Output Format

The Excel file contains the following columns:

| Column                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `sessionId`             | Session identifier                              |
| `questionType`          | Type of question asked                          |
| `user_messageId`        | Unique ID of the user message                   |
| `user_content`          | User's message (combines code and text content) |
| `assistant_messageId`   | Unique ID of the assistant message              |
| `assistant_content`     | Assistant's text response                       |
| `assistant_codeContent` | Assistant's code response                       |

## Data Safety

⚠️ **Important**: This script only **reads** data from MongoDB. It does **not** modify, update, or delete any data in your database.

## Troubleshooting

### Permission Error

If you get a permission error, make sure:

- The `sessions_data.xlsx` file is not open in Excel
- The script will automatically create a timestamped backup file if needed

### Connection Error

- Verify your MongoDB connection URI is correct
- Check your internet connection
- Ensure your IP address is whitelisted in MongoDB Atlas

### No Documents Found

- Verify the database name in `candidate_dbs`
- Check that the collection name is 'sessions'
- Ensure your database contains data

## License

This project is open source and available for educational purposes.
