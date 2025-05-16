from datetime import datetime, timedelta
from jose import jwt

# Secret key and algorithm from your app settings
SECRET_KEY = "06d8b13febb844d6a44d3e19320154dd9d3eb52c6bd2cb9cd828a8ebc736c9f8"  # Use your app's actual secret key
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=365)  # Long expiration for testing
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_token_for_role(role: str):
    # In a real app, you'd verify this is a valid user
    # Here we're just creating a token for testing
    token_data = {"sub": role}
    token = create_access_token(token_data)
    return token

if __name__ == "__main__":
    # Generate tokens for different roles
    admin_token = generate_token_for_role("admin")
    teacher_token = generate_token_for_role("teacher")
    student_token = generate_token_for_role("student")
    
    # Write tokens to a file
    with open("test_tokens.txt", "w") as f:
        f.write(f"Admin Token: {admin_token}\n\n")
        f.write(f"Teacher Token: {teacher_token}\n\n")
        f.write(f"Student Token: {student_token}\n\n")
    
    print("Tokens have been written to test_tokens.txt") 