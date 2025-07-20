#!/usr/bin/env python3
"""
Test to verify the circular import issue between AuthService and UserService has been fixed.
"""

def test_service_imports():
    """Test that both services can be imported without circular import errors"""
    try:
        print("🧪 Testing service imports for circular dependencies...")
        
        # Test importing AuthService
        from app.services.auth_service import AuthService
        print("✅ AuthService imported successfully")
        
        # Test importing UserService
        from app.services.user_service import UserService
        print("✅ UserService imported successfully")
        
        # Test importing both together
        from app.services.auth_service import AuthService
        from app.services.user_service import UserService
        print("✅ Both services imported together successfully")
        
        print("\n🎉 No circular import detected! Services are properly decoupled.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_user_service_password_methods():
    """Test that UserService has its own password hashing methods"""
    try:
        print("\n🧪 Testing UserService password methods...")
        
        from app.services.user_service import UserService
        from sqlalchemy.orm import Session
        
        # Create a mock session (we won't actually connect to DB)
        class MockSession:
            pass
        
        user_service = UserService(MockSession())
        
        # Test that the methods exist
        assert hasattr(user_service, 'get_password_hash'), "get_password_hash method not found"
        assert hasattr(user_service, 'verify_password'), "verify_password method not found"
        
        # Test password hashing
        password = "test_password_123"
        hashed = user_service.get_password_hash(password)
        
        # Verify the password
        is_valid = user_service.verify_password(password, hashed)
        
        assert is_valid, "Password verification failed"
        assert not user_service.verify_password("wrong_password", hashed), "Wrong password should not verify"
        
        print("✅ UserService password methods work correctly")
        print("✅ Password hashing is working")
        print("✅ Password verification is working")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing password methods: {e}")
        return False

if __name__ == "__main__":
    success1 = test_service_imports()
    success2 = test_user_service_password_methods()
    
    if success1 and success2:
        print("\n🎉 All tests passed! Circular import issue is fixed.")
        exit(0)
    else:
        print("\n❌ Some tests failed.")
        exit(1)
