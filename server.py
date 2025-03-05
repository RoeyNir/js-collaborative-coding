import sqlite3
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

rooms = {}  # מילון לניהול משתמשים בכל חדר

# יצירת Flask App
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet', logger=True, engineio_logger=True)

# התחברות למסד נתונים
def init_db():
    conn = sqlite3.connect("codeblocks.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS code_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            initial_code TEXT NOT NULL,
            solution TEXT NOT NULL,
            description TEXT
        )
    """)
    conn.commit()
    conn.close()

# הפעלת יצירת מסד הנתונים
init_db()

@app.route('/')
def home():
    return jsonify({"message": "Server is running with Flask-SocketIO!"})

@socketio.on("join_room")
def handle_join_room(data):
    room_id = data.get("room_id")
    previous_role = data.get("previous_role")

    if not room_id:
        print("❌ Error: room_id is missing!")
        return

    print(f"📩 Received join_room event for room {room_id}, socket ID: {request.sid}")

    if room_id not in rooms:
        rooms[room_id] = {"users": [], "mentor": None}

    existing_user = next((u for u in rooms[room_id]["users"] if u["id"] == request.sid), None)

    # ✅ שמירה על המנטור גם אחרי רענון
    if previous_role == "mentor" and rooms[room_id]["mentor"] is None:
        role = "mentor"
        rooms[room_id]["mentor"] = request.sid
        print(f"🟢 User {request.sid} rejoined as mentor")
    elif existing_user:
        role = existing_user["role"]
        print(f"🔄 User {request.sid} already in room {room_id}, keeping role {role}.")
    else:
        if rooms[room_id]["mentor"] is None:
            role = "mentor"
            rooms[room_id]["mentor"] = request.sid
            print(f"🟢 Assigned new mentor: {request.sid} for room {room_id}")
        else:
            role = "student"

    if not existing_user:
        rooms[room_id]["users"].append({"id": request.sid, "role": role})
        join_room(room_id)

    print(f"✅ User {request.sid} joined room {room_id} as {role}. Total users: {len(rooms[room_id]['users'])}")

    socketio.emit("user_update", {
        "users": len(rooms[room_id]["users"]),
        "role": role
    }, room=room_id)

@socketio.on("leave_room")
def handle_leave_room(room_id):
    if room_id not in rooms:
        return

    user = next((u for u in rooms[room_id]["users"] if u["id"] == request.sid), None)

    if user:
        rooms[room_id]["users"].remove(user)
        leave_room(room_id)
        print(f"🔴 User {request.sid} ({user['role']}) left room {room_id}")

    # ✅ אם המשתמש הוא המנטור, מוציאים את כל הסטודנטים מהחדר
    if user and user["role"] == "mentor":
        print(f"🚨 Mentor {request.sid} left room {room_id}. Removing all students...")
        
        # שליחת הודעה לכל הסטודנטים שהם צריכים לעזוב
        for student in rooms[room_id]["users"]:
            socketio.emit("mentor_left", {}, room=student["id"])
        
        # ✅ מוחקים את החדר לחלוטין לאחר שהסטודנטים יצאו
        del rooms[room_id]
        print(f"❌ Room {room_id} deleted.")

    else:
        socketio.emit("user_update", {"users": len(rooms[room_id]["users"])}, room=room_id)

@socketio.on("mentor_exit")
def handle_mentor_exit(room_id):
    if room_id in rooms:
        print(f"🚨 Mentor exited room {room_id}. Removing all students...")

        # שליחת הודעה לכל הסטודנטים שהמנטור יצא
        for student in rooms[room_id]["users"]:
            if student["role"] == "student":
                socketio.emit("mentor_left", {}, room=student["id"])

        # מחיקת החדר כולו
        del rooms[room_id]
        print(f"❌ Room {room_id} deleted.")

@socketio.on("disconnect")
def handle_disconnect():
    for room_id in list(rooms.keys()):
        if request.sid in [u["id"] for u in rooms[room_id]["users"]]: 
            handle_leave_room(room_id)

# ✅ הוספת תמיכה בעדכון קוד בזמן אמת
@socketio.on("code_change")
def handle_code_change(data):
    room = data["room"]
    new_code = data["code"]
    print(f"📩 Received code update in room {room}: {new_code}")

    conn = sqlite3.connect("codeblocks.db")
    cursor = conn.cursor()
    
    # משיכת הפתרון הנכון מהמסד נתונים
    cursor.execute("SELECT solution FROM code_blocks WHERE id = ?", (room,))
    solution = cursor.fetchone()
    
    # השוואת הקוד לפתרון
    is_correct = solution and (new_code.strip() == solution[0].strip())
    
    print(f"✅ Checking answer: {new_code.strip()} == {solution[0].strip()} ? {is_correct}")  # בדיקה
    
    # עדכון הקוד במסד נתונים
    cursor.execute("UPDATE code_blocks SET initial_code = ? WHERE id = ?", (new_code, room))
    conn.commit()
    conn.close()

    # שליחת עדכון לכל הלקוחות
    socketio.emit("code_update", {"code": new_code, "is_correct": is_correct}, room=room)

@socketio.on("send_message")
def handle_send_message(data):
    room_id = data.get("room_id")
    username = data.get("username", "Anonymous")
    message = data.get("message", "").strip()

    if not room_id or not message:
        return  # אם אין הודעה או חדר, לא לעשות כלום

    print(f"💬 Message in room {room_id}: {username}: {message}")

    # שידור ההודעה לכל המשתמשים בחדר
    socketio.emit("receive_message", {
        "username": username,
        "message": message
    }, room=room_id)

@app.route('/codeblocks', methods=['GET'])
def get_code_blocks():
    conn = sqlite3.connect("codeblocks.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, initial_code FROM code_blocks")
    blocks = [{"id": row[0], "title": row[1], "initial_code": row[2]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(blocks)

@app.route('/codeblock/<int:block_id>', methods=['GET'])
def get_code_block(block_id):
    conn = sqlite3.connect("codeblocks.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, initial_code, solution, description FROM code_blocks WHERE id = ?", (block_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify({
            "id": row[0],
            "title": row[1],
            "initial_code": row[2],
            "solution": row[3],
            "description": row[4]
        })
    else:
        return jsonify({"error": "Code block not found"}), 404

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
