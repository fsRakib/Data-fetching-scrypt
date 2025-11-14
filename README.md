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

### Step 1: Install Python

Make sure you have Python 3.7 or higher installed on your system.

**Check if Python is installed:**

```bash
python --version
```

**If Python is not installed:**

- **Windows**: Download from [python.org](https://www.python.org/downloads/) and run the installer
  - ✅ **Important**: Check "Add Python to PATH" during installation
- **Mac**: Use Homebrew: `brew install python3`
- **Linux**: Use package manager: `sudo apt install python3 python3-pip` (Ubuntu/Debian)

### Step 2: Download the Project

**Option A: Using Git (Recommended)**

```bash
git clone https://github.com/fsRakib/Data-fetching-scrypt.git
cd Data-fetching-scrypt
```

**Option B: Download ZIP**

1. Download the project as ZIP from GitHub
2. Extract the ZIP file
3. Open terminal/command prompt and navigate to the extracted folder:
   ```bash
   cd path/to/Data-fetching-scrypt
   ```

### Step 3: Create a Virtual Environment (Recommended)

A virtual environment keeps project dependencies isolated from other Python projects.

```bash
python -m venv .venv
```

### Step 4: Activate the Virtual Environment

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**

```cmd
.venv\Scripts\activate.bat
```

**Linux/Mac:**

```bash
source .venv/bin/activate
```

💡 **Tip**: You should see `(.venv)` at the beginning of your command prompt when activated.

### Step 5: Install Required Packages

```bash
pip install -r requirements.txt
```

This will install:

- `pymongo` - MongoDB driver for Python
- `pandas` - Data manipulation library
- `openpyxl` - Excel file handling

### Step 6: Verify Installation

Check that all packages are installed correctly:

```bash
pip list
```

You should see `pymongo`, `pandas`, and `openpyxl` in the list.

## Configuration

### Step 1: Get MongoDB Atlas Credentials

1. Log in to your [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas)
2. Navigate to your cluster
3. Click "Connect" → "Connect your application"
4. Copy your connection string (it looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)

### Step 2: Update the Script

Open the main script file (e.g., `mongo_v3.py`) in a text editor and update the MongoDB connection URI:

```python
uri = "mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
```

**Replace:**

- `YOUR_USERNAME` with your MongoDB username
- `YOUR_PASSWORD` with your MongoDB password
- `YOUR_CLUSTER` with your cluster address

### Step 3: Verify Database Name

The script checks for these databases in order:

- `Effective_Learning_db`
- `Eeffective_Learning_db`

If your database has a different name, update the `candidate_dbs` list in the script:

```python
candidate_dbs = ["Your_Database_Name", "Effective_Learning_db"]
```

### Step 4: Whitelist Your IP Address

In MongoDB Atlas:

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Either add your current IP or click "Allow Access from Anywhere" (for testing only)

## Usage

### Running the Script

1. Make sure your virtual environment is activated (you should see `(.venv)` in your prompt)

2. Run the script:

   ```bash
   python mongo_v3.py
   ```

   **Note**: Replace `mongo_v3.py` with the version you want to use (`mongo_v1.py`, `mongo_v2.py`, or `mongo_v3.py`)

3. The script will:
   - Connect to your MongoDB Atlas database
   - Find and count documents in the 'sessions' collection
   - Export data to `sessions_data.xlsx` (or a timestamped file if the original is locked)
   - Display progress in the terminal

### Expected Output

```
Using DB: Effective_Learning_db
Found 150 documents in 'sessions'.
Successfully exported 150 rows to sessions_data.xlsx
```

### Opening the Excel File

After the script completes successfully:

1. Look for `sessions_data.xlsx` in the project folder
2. Open it with Microsoft Excel, Google Sheets, or any spreadsheet application
3. Review the exported data

### Troubleshooting During First Run

**"ModuleNotFoundError: No module named 'pymongo'"**

- Solution: Make sure you activated the virtual environment and ran `pip install -r requirements.txt`

**"Authentication failed"**

- Solution: Double-check your MongoDB username and password in the connection URI

**"IP not whitelisted"**

- Solution: Add your IP address in MongoDB Atlas Network Access settings

**"No documents to export"**

- Solution: Verify your database name and collection name are correct

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
