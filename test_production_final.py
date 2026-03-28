import httpx
import asyncio

# The production URL for Render
RENDER_URL = "https://branchiq.onrender.com/api/auth/login"

async def test_production_login():
    email = "nikhilshukla5686@gmail.com"
    password = "Nikhil@12345"
    
    # OAuth2PasswordRequestForm expects form data
    data = {"username": email, "password": password}
    
    print(f"Testing login at {RENDER_URL} for {email}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(RENDER_URL, data=data)
            print(f"Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error connecting to Render: {e}")

if __name__ == "__main__":
    asyncio.run(test_production_login())
