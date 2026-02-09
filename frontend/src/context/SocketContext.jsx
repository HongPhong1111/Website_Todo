import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used inside SocketProvider");
  }
  return ctx;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  const [socket, setSocket] = useState(null); // ✅ dùng state để render
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socketRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance); // ✅ expose qua state

    socketInstance.on("connect", () => {
      console.log("🟢 Socket connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket, // ✅ SAFE
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
