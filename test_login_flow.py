import requests

def test_api():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login user
    print("Attempting to log in as test73@example.com...")
    login_res = requests.post(f"{base_url}/auth/login", json={
        "email": "test73@example.com",
        "password": "password123!A"
    })
    
    if login_res.status_code == 200:
        print("Login successful!")
        data = login_res.json()["data"]
        token = data["access_token"]
        user = data["user"]
    else:
        print(f"Login failed: {login_res.status_code} {login_res.text}")
        # Try to register
        print("Registering new user...")
        reg_res = requests.post(f"{base_url}/auth/register", json={
            "email": "test73@example.com",
            "password": "password123!A",
            "first_name": "Test",
            "last_name": "User"
        })
        print(f"Register status: {reg_res.status_code} {reg_res.text}")
        
        # Verify email (bypassing email SMTP code verification via directly calling login or DB update since OTP was set)
        # Wait, register successful means we need to verify email or verify OTP?
        # Let's see if we can log in directly after registering.
        print("Attempting to log in again...")
        login_res = requests.post(f"{base_url}/auth/login", json={
            "email": "test73@example.com",
            "password": "password123!A"
        })
        if login_res.status_code != 200:
            print(f"Login still failed: {login_res.status_code} {login_res.text}")
            return
        data = login_res.json()["data"]
        token = data["access_token"]
        user = data["user"]
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Check current org
    print("Checking user organization...")
    me_res = requests.get(f"{base_url}/auth/me", headers=headers)
    print("Me response:", me_res.json())
    org_id = me_res.json()["data"]["org_id"]
    
    if not org_id:
        print("Setting up organization...")
        org_res = requests.post(f"{base_url}/organization", json={
            "name": "Acme Test Corp",
            "currency": "INR",
            "timezone": "UTC"
        }, headers=headers)
        print(f"Organization creation status: {org_res.status_code} {org_res.text}")
        if org_res.status_code == 200:
            org_id = org_res.json()["data"]["id"]
            # Re-auth or check org
            headers["Authorization"] = f"Bearer {token}" # Access token won't have org_id until we refresh it, or does the API load user org_id dynamically?
            # Actually, jwt token contains org_id. If we update org, we might need to login/refresh token to get a new token containing the org_id.
            # Let's try log in again to get fresh token with org_id.
            login_res = requests.post(f"{base_url}/auth/login", json={
                "email": "test73@example.com",
                "password": "password123!A"
            })
            token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create lead
    print("Creating a new lead...")
    lead_res = requests.post(f"{base_url}/leads", json={
        "name": "John Doe",
        "email": "johndoe@example.com",
        "phone": "+919876543210",
        "company": "John Doe Ltd",
        "value": 150000,
        "source": "referral",
        "status": "new"
    }, headers=headers)
    print(f"Lead creation status: {lead_res.status_code} {lead_res.text}")
    
    # 4. List leads
    print("Listing leads...")
    list_res = requests.get(f"{base_url}/leads", headers=headers)
    print("Leads list response:")
    print(list_res.json())

if __name__ == "__main__":
    test_api()
