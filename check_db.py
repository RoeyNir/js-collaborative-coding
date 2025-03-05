import sqlite3

conn = sqlite3.connect("codeblocks.db")
cursor = conn.cursor()

# שליפת כל הנתונים בטבלה
cursor.execute("SELECT * FROM code_blocks")
rows = cursor.fetchall()

if rows:
    print("✅ קטעי הקוד במסד הנתונים:")
    for row in rows:
        print(f"ID: {row[0]}, Title: {row[1]}, Initial Code: {row[2]}, Solution: {row[3]}")
else:
    print("❌ אין נתונים בטבלה!")

conn.close()
