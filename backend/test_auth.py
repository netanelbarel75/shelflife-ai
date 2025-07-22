#!/usr/bin/env python3

"""
Authentication Test Script for ShelfLife.AI
Tests login/logout functionality and token management.
"""

import sys
import os
import requests
import json
import time

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

API_BASE = "http://localhost:8000"

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def log(message):
    print(f"{Colors.BLUE}[TEST]{Colors.NC} {message}")

def success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")

def warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.NC}")

def error(message):
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def test_api_health():
    """Test if API is running."""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            success("API is running")
            return True
        else:
            error(f"API health check failed: {response.status_code}")
            return False
    except requests.RequestException as e:
        error(f"Cannot connect to API: {e}")
        return False

def test_login(email, password):
    """Test user login."""
    log(f"Testing login for {email}")
    
    try:
        login_data = {
            "email": email,
            "password": password
        }
        
        response = requests.post(
            f"{API_BASE}/api/auth/login", 
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            success(f"Login successful for {email}")
            
            # Check required fields in response
            required_fields = ["access_token", "token_type", "expires_in"]
            for field in required_fields:
                if field not in token_data:
                    warning(f"Missing field in token response: {field}")
                else:
                    log(f"  {field}: {token_data[field] if field != 'access_token' else token_data[field][:20] + '...'}")
            
            # Check user data
            if "user" in token_data:
                user = token_data["user"]
                log(f"  User: {user.get('first_name', '')} {user.get('last_name', '')} ({user.get('username', '')})")
                log(f"  User ID: {user.get('id', 'N/A')}")
            
            return token_data
        else:
            error(f"Login failed for {email}: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"    Error: {error_detail}")
            except:
                print(f"    Response: {response.text}")
            return None
            
    except requests.RequestException as e:
        error(f"Login request failed: {e}")
        return None

def test_protected_endpoint(access_token):
    """Test accessing protected endpoint with token."""
    log("Testing protected endpoint (/api/auth/me)")
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{API_BASE}/api/auth/me", headers=headers)
        
        if response.status_code == 200:
            user_data = response.json()
            success("Protected endpoint access successful")
            log(f"  User: {user_data.get('first_name', '')} {user_data.get('last_name', '')}")
            log(f"  Email: {user_data.get('email', 'N/A')}")
            return True
        else:
            error(f"Protected endpoint access failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"    Error: {error_detail}")
            except:
                print(f"    Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        error(f"Protected endpoint request failed: {e}")
        return False

def test_logout(access_token):
    """Test user logout."""
    log("Testing logout")
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(f"{API_BASE}/api/auth/logout", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            success("Logout successful")
            log(f"  Message: {result.get('message', 'N/A')}")
            return True
        else:
            error(f"Logout failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"    Error: {error_detail}")
            except:
                print(f"    Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        error(f"Logout request failed: {e}")
        return False

def test_token_after_logout(access_token):
    """Test that token is invalid after logout."""
    log("Testing token validity after logout")
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{API_BASE}/api/auth/me", headers=headers)
        
        if response.status_code == 401:
            success("Token correctly invalidated after logout")
            return True
        else:
            warning(f"Token still valid after logout (status: {response.status_code})")
            return False
            
    except requests.RequestException as e:
        error(f"Token validation request failed: {e}")
        return False

def test_invalid_credentials():
    """Test login with invalid credentials."""
    log("Testing login with invalid credentials")
    
    try:
        login_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(
            f"{API_BASE}/api/auth/login", 
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 401:
            success("Invalid credentials correctly rejected")
            return True
        else:
            warning(f"Expected 401 for invalid credentials, got {response.status_code}")
            return False
            
    except requests.RequestException as e:
        error(f"Invalid credentials test failed: {e}")
        return False

def test_refresh_token(refresh_token):
    """Test refresh token functionality."""
    log("Testing refresh token")
    
    if not refresh_token:
        warning("No refresh token provided, skipping test")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {refresh_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(f"{API_BASE}/api/auth/refresh", headers=headers)
        
        if response.status_code == 200:
            token_data = response.json()
            success("Refresh token successful")
            log(f"  New access token: {token_data.get('access_token', 'N/A')[:20]}...")
            return token_data
        else:
            error(f"Refresh token failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"    Error: {error_detail}")
            except:
                print(f"    Response: {response.text}")
            return None
            
    except requests.RequestException as e:
        error(f"Refresh token request failed: {e}")
        return None

def run_authentication_tests():
    """Run comprehensive authentication tests."""
    print(f"{Colors.BLUE}")
    print("🔐 ShelfLife.AI Authentication Tests")
    print("====================================")
    print(f"{Colors.NC}")
    
    test_results = []
    
    # Test API health
    if not test_api_health():
        error("API is not running. Please start the server first.")
        return False
    
    test_results.append(("API Health", True))
    
    # Demo user credentials
    demo_users = [
        {"email": "demo@shelflife.ai", "password": "demo123"},
        {"email": "alice@example.com", "password": "alice123"},
        {"email": "bob@example.com", "password": "bob123"}
    ]
    
    # Test each demo user
    for user in demo_users:
        print(f"\n{Colors.YELLOW}Testing user: {user['email']}{Colors.NC}")
        
        # Test login
        token_data = test_login(user["email"], user["password"])
        if token_data:
            test_results.append((f"Login {user['email']}", True))
            
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            
            if access_token:
                # Test protected endpoint
                if test_protected_endpoint(access_token):
                    test_results.append((f"Protected Access {user['email']}", True))
                else:
                    test_results.append((f"Protected Access {user['email']}", False))
                
                # Test refresh token if available
                if refresh_token:
                    new_token_data = test_refresh_token(refresh_token)
                    if new_token_data:
                        test_results.append((f"Refresh Token {user['email']}", True))
                        # Use new token for logout test
                        access_token = new_token_data.get("access_token", access_token)
                    else:
                        test_results.append((f"Refresh Token {user['email']}", False))
                
                # Test logout
                if test_logout(access_token):
                    test_results.append((f"Logout {user['email']}", True))
                    
                    # Test token invalidation
                    if test_token_after_logout(access_token):
                        test_results.append((f"Token Invalidation {user['email']}", True))
                    else:
                        test_results.append((f"Token Invalidation {user['email']}", False))
                else:
                    test_results.append((f"Logout {user['email']}", False))
            else:
                error("No access token received")
                test_results.append((f"Login {user['email']}", False))
        else:
            test_results.append((f"Login {user['email']}", False))
    
    # Test invalid credentials
    print(f"\n{Colors.YELLOW}Testing invalid credentials{Colors.NC}")
    if test_invalid_credentials():
        test_results.append(("Invalid Credentials", True))
    else:
        test_results.append(("Invalid Credentials", False))
    
    # Summary
    print(f"\n{Colors.BLUE}Test Results Summary{Colors.NC}")
    print("=" * 40)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        color = Colors.GREEN if result else Colors.RED
        print(f"{color}{status}{Colors.NC} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n{Colors.GREEN}🎉 All authentication tests passed!{Colors.NC}")
        print(f"✅ Login functionality is working")
        print(f"✅ Logout functionality is working") 
        print(f"✅ Token management is working")
        return True
    else:
        print(f"\n{Colors.YELLOW}⚠️  {total - passed} test(s) failed.{Colors.NC}")
        print(f"\n{Colors.BLUE}Troubleshooting tips:{Colors.NC}")
        print("1. Ensure the API server is running: ./start_shelflife.sh")
        print("2. Check demo data exists: python manage_db.py demo")
        print("3. Verify database status: python manage_db.py status")
        print("4. Check server logs for authentication errors")
        return False

if __name__ == "__main__":
    try:
        success = run_authentication_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests cancelled by user{Colors.NC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.NC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
