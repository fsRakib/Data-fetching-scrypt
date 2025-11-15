"""
Validation script for System B Response Generator (Database Push Version)
Checks all requirements and verifies MongoDB collections
"""
import os
import sys

def check_dependencies():
    """Check if all required packages are installed"""
    print("=" * 80)
    print("STEP 1: Checking Dependencies")
    print("=" * 80)
    
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


def check_env_variables():
    """Check environment variables"""
    print("=" * 80)
    print("STEP 2: Checking Environment Variables")
    print("=" * 80)
    
    from dotenv import load_dotenv
    load_dotenv()
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    mongodb_uri = os.environ.get("MONGODB_URI")
    
    if not openai_key:
        print("❌ OPENAI_API_KEY not found")
        return False
    else:
        print(f"✓ OPENAI_API_KEY found: {openai_key[:10]}...{openai_key[-4:]}")
    
    if not mongodb_uri:
        print("❌ MONGODB_URI not found")
        return False
    else:
        print(f"✓ MONGODB_URI found: {mongodb_uri[:25]}...")
    
    print()
    return True


def test_mongodb_connection():
    """Test MongoDB connection and verify collections"""
    print("=" * 80)
    print("STEP 3: Testing MongoDB Connection & Collections")
    print("=" * 80)
    
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        
        load_dotenv()
        mongodb_uri = os.environ.get("MONGODB_URI")
        
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("✓ Successfully connected to MongoDB Atlas")
        
        db = client["Eeffective_Learning_db"]
        
        # Check sessions collection (System A data)
        sessions_collection = db["sessions"]
        sessions_count = sessions_collection.count_documents({})
        print(f"\n📊 Sessions Collection (System A):")
        print(f"   - Total sessions: {sessions_count}")
        
        if sessions_count == 0:
            print("   ⚠ Warning: No sessions found!")
        else:
            # Get sample session
            sample = sessions_collection.find_one({})
            if sample:
                messages = sample.get('messages', [])
                print(f"   - Sample session has {len(messages)} messages")
                if messages:
                    first_user_msg = next((m for m in messages if m.get('role') == 'user'), None)
                    if first_user_msg:
                        print(f"   - Sample has user message with questionType: {first_user_msg.get('questionType', 'N/A')}")
        
        # Check systembresponses collection (System B data)
        systemb_collection = db["systembresponses"]
        systemb_count = systemb_collection.count_documents({})
        print(f"\n📊 System B Responses Collection:")
        print(f"   - Total System B responses: {systemb_count}")
        
        if systemb_count == 0:
            print("   ℹ No System B responses yet (will be created by the script)")
        else:
            sample_b = systemb_collection.find_one({})
            if sample_b:
                print(f"   - Sample sessionId: {sample_b.get('sessionId', 'N/A')[:30]}...")
                print(f"   - Sample questionType: {sample_b.get('questionType', 'N/A')}")
        
        # Check if compound index exists on systembresponses
        indexes = systemb_collection.index_information()
        has_compound_index = any(
            'sessionId' in str(idx) and 'messageIndex' in str(idx)
            for idx in indexes.values()
        )
        
        if has_compound_index:
            print(f"   ✓ Compound index (sessionId, messageIndex) exists")
        else:
            print(f"   ⚠ Creating compound index for systembresponses...")
            systemb_collection.create_index(
                [('sessionId', 1), ('messageIndex', 1)],
                unique=True
            )
            print(f"   ✓ Index created successfully")
        
        client.close()
        print("\n✅ MongoDB verification complete\n")
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False


def check_output_directory():
    """Check output directory"""
    print("=" * 80)
    print("STEP 4: Checking Output Directory")
    print("=" * 80)
    
    output_dir = r"d:\Data fetching scrypt\data"
    
    if not os.path.exists(output_dir):
        print(f"Creating output directory: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
    
    print(f"✓ Output directory exists: {output_dir}")
    
    # Test write permission
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
    print("\n" + "=" * 80)
    print("🔍 VALIDATION FOR SYSTEM B RESPONSE GENERATOR")
    print("   (Database Push Version - Stores to MongoDB + Excel)")
    print("=" * 80 + "\n")
    
    all_checks = [
        check_dependencies(),
        check_env_variables(),
        test_mongodb_connection(),
        check_output_directory()
    ]
    
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    
    if all(all_checks):
        print("✅ ALL CHECKS PASSED!")
        print("\n📋 What the script will do:")
        print("   1. Fetch sessions from MongoDB (collection: sessions)")
        print("   2. For each session's first user message:")
        print("      - Generate System B COT response using GPT-4o")
        print("      - Store in MongoDB (collection: systembresponses)")
        print("   3. Save all data to Excel file")
        print("\n🚀 Ready to run:")
        print('   python "System_B_Response\\Sysytem_B_response_collector_from_database_push_database.py"')
        print("\n📊 Output locations:")
        print("   - MongoDB: Eeffective_Learning_db.systembresponses")
        print("   - Excel: d:\\Data fetching scrypt\\data\\system_B_responses_complete.xlsx")
        return 0
    else:
        print("❌ SOME CHECKS FAILED!")
        print("\nPlease fix the issues above before running the script.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
