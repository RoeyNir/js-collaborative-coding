import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCodeBlockById } from "../api";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { io } from "socket.io-client";
import "./CodeBlockPage.css";

const socket = io("https://js-collaborative-coding-production.up.railway.app", {
    transports: ["websocket", "polling"]
});

const CodeBlockPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [codeBlock, setCodeBlock] = useState(null);
    const [code, setCode] = useState("");
    const [usersInRoom, setUsersInRoom] = useState(0);
    const [role, setRole] = useState(null);
    const [hasJoined, setHasJoined] = useState(false);

    // ✅ סטייט לניהול הודעות צ'אט
    const [messages, setMessages] = useState([]);
    const [chatMessage, setChatMessage] = useState("");

    // ✅ טעינת קובץ הקוד מהשרת
    useEffect(() => {
        const loadCodeBlock = async () => {
            console.log("🔵 Fetching code block:", id);
            const block = await fetchCodeBlockById(id);
            if (block) {
                setCodeBlock(block);
                setCode(block.initial_code);
            }
        };
        loadCodeBlock();
    }, [id]);

    // ✅ הצטרפות לחדר
    useEffect(() => {
        if (!codeBlock || hasJoined) return;

        console.log("🔵 Joining room:", id, "with role:", role);
        socket.emit("join_room", { room_id: id, previous_role: role });
        setHasJoined(true);
    }, [codeBlock, id, hasJoined]);

    // ✅ האזנה לעדכון המשתמשים ועדכון UI של התפקיד
    useEffect(() => {
        const handleUserUpdate = (data) => {
            console.log("🔄 Received user update:", data);
            setUsersInRoom(data.users);

            if (!role || role === "student") {
                console.log(`🎭 Assigning role: ${data.role}`);
                setRole(data.role);
            }
        };

        const handleMentorLeft = () => {
            console.log("🚨 Mentor left! Redirecting to lobby...");
            alert("The mentor has left. Returning to lobby...");
            setRole(null);
            navigate("/");
        };

        socket.on("user_update", handleUserUpdate);
        socket.on("mentor_left", handleMentorLeft);

        return () => {
            socket.off("user_update", handleUserUpdate);
            socket.off("mentor_left", handleMentorLeft);
        };
    }, [role]);

    // ✅ קבלת הודעות צ'אט
    useEffect(() => {
        const handleReceiveMessage = (data) => {
            console.log("💬 Received chat message:", data);
            setMessages((prevMessages) => [...prevMessages, data]);
        };

        socket.on("receive_message", handleReceiveMessage);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
        };
    }, []);

    // ✅ שליחת הודעה בצ'אט
    const sendMessage = () => {
        if (chatMessage.trim() === "") return;

        socket.emit("send_message", {
            room_id: id,
            username: role === "mentor" ? "Mentor" : "Student",
            message: chatMessage
        });

        setChatMessage(""); // ניקוי שדה ההקלדה
    };

    // ✅ יציאה מהחדר (גם מנטור וגם סטודנט)
    const exitRoom = () => {
        console.log("🚪 Exiting room:", id);
        socket.emit("leave_room", id);

        if (role === "mentor") {
            console.log("🛑 Mentor exiting - removing all students...");
            socket.emit("mentor_exit", id);
        }

        setRole(null);
        navigate("/");
    };

    if (!codeBlock) {
        return <p>Loading code block...</p>;
    }

    return (
        <div className="code-block-container">
            <h1 className="code-title">{codeBlock.title}</h1>
            <p className="code-description">{codeBlock.description}</p>
            <p className="user-count">Users in room: {usersInRoom}</p>
            <p className="user-role">Your role: <strong>{role || "loading..."}</strong></p>
            <button onClick={exitRoom} className="exit-button">Exit to Lobby</button>

            {/* ✅ עורך הקוד */}
            <div className="code-editor">
                <CodeMirror
                    value={code}
                    extensions={[javascript()]}
                    theme={oneDark}
                    onChange={(newCode) => {
                        if (role !== "mentor") {
                            setCode(newCode);
                            socket.emit("code_change", { room: id, code: newCode });
                        }
                    }}
                    basicSetup={{ lineNumbers: true, highlightActiveLine: true, tabSize: 4 }}
                    editable={role !== "mentor"}
                />
            </div>

            {/* ✅ צ'אט חדר */}
            <div className="chat-container">
                <h3>Chat</h3>
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <p key={index}><strong>{msg.username}:</strong> {msg.message}</p>
                    ))}
                </div>
                <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default CodeBlockPage;
