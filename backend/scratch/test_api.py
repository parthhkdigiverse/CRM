import sys
import requests
import json

res = requests.post("http://localhost:8000/api/v1/auth/login", json={"email": "parthhkdigiverse1@gmail.com", "password": "password123"}) # I don't know the password
print(res.text)
