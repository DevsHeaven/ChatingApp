require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const initSocket = require("./sockets/socketHandler");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// --- Middleware ---
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// --- Routes ---
app.get("/api/health", (req, res) => {
  const ttlHours = (parseInt(process.env.DATA_TTL_SECONDS, 10) || 259200) / 3600;
  res.json({ status: "ok", message: "TempChat API is running", dataResetHours: ttlHours });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- Socket.io ---
initSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`TempChat API + sockets listening on http://localhost:${PORT}`);
  });
});
