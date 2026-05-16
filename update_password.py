import sys
import os
import bcrypt
import psycopg2

password = "Ali055ali"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

conn = psycopg2.connect("postgresql://01capital:01capital@localhost:5432/01capital")
cur = conn.cursor()
cur.execute("UPDATE users SET hashed_password = %s WHERE email = 'ali.alghamdi.ps@gmail.com'", (hashed,))
conn.commit()
cur.close()
conn.close()
print("Password updated successfully.")
