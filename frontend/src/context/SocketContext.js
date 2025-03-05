import React, { createContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

const useSocket = () => {
    const socketRef = useRef(null);

    if (!socketRef.current) {
        socketRef.current = io("http://127.0.0.1:5000", {
            transports: ["websocket"], // כופה שימוש ב-WebSocket בלבד
            reconnection: true, // מאפשר חיבור מחדש אם החיבור נופל
            reconnectionAttempts: 10, // כמה ניסיונות חיבור מחדש
            reconnectionDelay: 3000, // מרווח זמן בין ניסיונות חיבור מחדש
            timeout: 20000, // זמן מקסימלי לחיבור
        });
    }

    return socketRef.current;
};

const SocketProvider = ({ children }) => {
    const socket = useSocket();
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("✅ WebSocket connected!");
        });

        socket.on("server_message", (data) => {
            console.log("📩 Received:", data.message);
            setMessages((prev) => [...prev, data.message]);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 WebSocket closed! Reason:", reason);
        });

        socket.on("connect_error", (error) => {
            console.error("❌ WebSocket connection error:", error);
        });

        return () => {
            console.log("⚠️ Cleanup function running, but socket is persistent.");
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, messages }}>
            {children}
        </SocketContext.Provider>
    );
};

export { SocketProvider };
export default useSocket;
