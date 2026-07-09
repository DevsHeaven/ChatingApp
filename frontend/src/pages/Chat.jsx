import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [friendName, setFriendName] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      setError("");
      const [{ data: msgData }, { data: friendsData }] = await Promise.all([
        api.get(`/messages/${userId}`),
        api.get("/friends"),
      ]);
      setMessages(msgData.messages);
      const friend = friendsData.friends.find((f) => f.user.id === userId);
      setFriendName(friend?.user.username || "Chat");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load this chat.");
    }
  }, [userId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg) => {
      // Only append messages that belong to this open conversation
      if (msg.sender === userId || msg.receiver === userId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    const onTyping = ({ from }) => {
      if (from === userId) setIsTyping(true);
    };
    const onStopTyping = ({ from }) => {
      if (from === userId) setIsTyping(false);
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
    };
  }, [userId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const socket = getSocket();
    socket.emit("send_message", { to: userId, text: text.trim() }, (res) => {
      if (res?.error) setError(res.error);
    });
    socket.emit("stop_typing", { to: userId });
    setText("");
  };

  const handleChangeText = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket) return;

    socket.emit("typing", { to: userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("stop_typing", { to: userId }), 1200);
  };

  return (
    <div className="chat-page">
      <header className="chat-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="chat-title">
          <div className="avatar">{friendName[0]?.toUpperCase() || "?"}</div>
          <span>{friendName}</span>
        </div>
        <span className="expiry-badge">messages self-delete after 72h</span>
      </header>

      {error && <div className="alert alert-error chat-error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && !error && (
          <div className="empty-state">
            <p>No messages yet. Say hi 👋</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m._id}
            className={`bubble-row ${m.sender === user.id ? "bubble-row-mine" : ""}`}
          >
            <div className={`bubble ${m.sender === user.id ? "bubble-mine" : "bubble-theirs"}`}>
              <div className="bubble-text">{m.text}</div>
              <div className="bubble-time">{formatTime(m.createdAt)}</div>
            </div>
          </div>
        ))}
        {isTyping && <div className="typing-indicator">{friendName} is typing…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={handleChangeText}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
