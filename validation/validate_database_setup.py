"""
Pre-run validation script for System B Response Collector (Database Version)
Checks all requirements before running the database script
"""
import os
import sys

def check_dependencies():
    """Check if all required packages are installed"""
    print("=" * 60)
    print("STEP 1: Checking Dependencies")
    print("=" * 60)
    
    required_packages = {
        'pandas': 'pandas',
        'openpyxl': 'openpyxl',
        'openai': 'openai',
        'python-dotenv': 'dotenv',
        'pymongo': 'pymongo'
    }
    
    missing_packages = []
    
    for package_name, import_name in required_packages.items():
        try:
            __import__(import_name)
            print(f"✓ {package_name} is installed")
        except ImportError:
            print(f"✗ {package_name} is NOT installed")
            missing_packages.append(package_name)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print(f"\nInstall them with: pip install {' '.join(missing_packages)}")
        return False
    
    print("\n✅ All dependencies are installed\n")
    return True


def check_env_file():
    """Check if .env file exists and has required variables"""
    print("=" * 60)
    print("STEP 2: Checking Environment Variables")
    print("=" * 60)
    
    env_file = r"d:\Data fetching scrypt\.env"
    
    if not os.path.exists(env_file):
        print(f"❌ .env file not found: {env_file}")
        return False
    else:
        print(f"✓ .env file exists: {env_file}")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check OpenAI API key
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in .env file")
        return False
    else:
        key_preview = f"{openai_key[:10]}...{openai_key[-4:]}"
        print(f"✓ OPENAI_API_KEY found: {key_preview}")
    
    # Check MongoDB URI
    mongodb_uri = os.environ.get("MONGODB_URI")
    if not mongodb_uri:
        print("❌ MONGODB_URI not found in .env file")
        print("   Please add: MONGODB_URI=your_mongodb_connection_string")
        return False
    else:
        # Hide password in URI
        uri_preview = mongodb_uri[:25] + "..." + mongodb_uri[-30:]
        print(f"✓ MONGODB_URI found: {uri_preview}")
    
    print()
    return True


def test_mongodb_connection():
    """Test connection to MongoDB"""
    print("=" * 60)
    print("STEP 3: Testing MongoDB Connection")
    print("=" * 60)
    
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        
        load_dotenv()
        mongodb_uri = os.environ.get("MONGODB_URI")
        
        print("Connecting to MongoDB...")
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.server_info()
        print("✓ Successfully connected to MongoDB")
        
        # Check database and collection
        db_name = "Eeffective_Learning_db"
        collection_name = "sessions"
        
        db = client[db_name]
        collection = db[collection_name]
        
        # Count documents
        doc_count = collection.count_documents({})
        print(f"✓ Database: {db_name}")
        print(f"✓ Collection: {collection_name}")
        print(f"✓ Total sessions: {doc_count}")
        
        if doc_count == 0:
            print("⚠ Warning: No sessions found in database")
        
        # Check sample document structure
        sample = collection.find_one({})
        if sample:
            print(f"\n📋 Sample Session Structure:")
            print(f"   - Session ID: {sample.get('sessionId', 'N/A')}")
            print(f"   - Messages count: {len(sample.get('messages', []))}")
            
            messages = sample.get('messages', [])
            if messages:
                first_msg = messages[0]
                print(f"   - First message role: {first_msg.get('role', 'N/A')}")
                print(f"   - Has questionType: {'questionType' in first_msg}")
        
        client.close()
        print("\n✅ MongoDB connection test passed\n")
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("\nPossible issues:")
        print("   1. Check your MongoDB URI in .env file")
        print("   2. Verify network/firewall settings")
        print("   3. Ensure MongoDB Atlas IP whitelist includes your IP")
        return False


def check_output_directory():
    """Check if output directory exists"""
    print("=" * 60)
    print("STEP 4: Checking Output Directory")
    print("=" * 60)
    
    output_dir = r"d:\Data fetching scrypt\System_B_Response"
    
    if not os.path.exists(output_dir):
        print(f"⚠ Output directory doesn't exist: {output_dir}")
        print("  Creating directory...")
        os.makedirs(output_dir, exist_ok=True)
        print("✓ Directory created")
    else:
        print(f"✓ Output directory exists: {output_dir}")
    
    # Check write permissions
    test_file = os.path.join(output_dir, "test_write.tmp")
    try:
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        print("✓ Directory is writable")
    except Exception as e:
        print(f"❌ Cannot write to directory: {e}")
        return False
    
    print()
    return True


def main():
    """Run all validation checks"""
    print("\n" + "=" * 60)
    print("🔍 PRE-RUN VALIDATION FOR DATABASE VERSION")
    print("=" * 60 + "\n")
    
    all_checks = [
        check_dependencies(),
        check_env_file(),
        test_mongodb_connection(),
        check_output_directory()
    ]
    
    print("=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    if all(all_checks):
        print("✅ ALL CHECKS PASSED!")
        print("\nYou can now run the database script:")
        print('   python "System_B_Response\\Sysytem_B_response_collector_database.py"')
        print("\nOutput will be saved to:")
        print('   d:\\Data fetching scrypt\\System_B_Response\\system_B_response_from_db.xlsx')
        return 0
    else:
        print("❌ SOME CHECKS FAILED!")
        print("\nPlease fix the issues above before running the script.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
