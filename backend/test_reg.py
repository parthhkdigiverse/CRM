import bcrypt
try:
    bcrypt.__about__
except AttributeError:
    class __about__:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = __about__

import requests

res = requests.post('http://localhost:8000/api/v1/auth/register', json={
    'email': 'test73@example.com',
    'password': 'password123!A',
    'first_name': 'Test',
    'last_name': 'User'
})
print("Register:", res.status_code, res.text)
