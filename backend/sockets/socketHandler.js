const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const { assertAreFriends } = require("../controllers/messageController");
const { setIO } = require("./ioInstance");

const initSocket = (io) => {
  setIO(io);

  // Authenticate every socket connection using the same JWT the REST API uses
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User no longer exists"));

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Each user gets a private room named after their own ID, so we can
    // push events to them ("friend_request_received", new messages, etc.)
    // without needing to track socket IDs ourselves.
    socket.join(socket.userId);

    socket.on("send_message", async ({ to, text }, callback) => {
      try {
        if (!to || !text || !text.trim()) {
          return callback?.({ error: "Message needs a recipient and text" });
        }

        const areFriends = await assertAreFriends(socket.userId, to);
        if (!areFriends) {
          return callback?.({ error: "You can only message friends" });
        }

        const conversationId = Message.buildConversationId(socket.userId, to);
        const message = await Message.create({
          sender: socket.userId,
          receiver: to,
          conversationId,
          text: text.trim(),
        });

        const payload = {
          _id: message._id,
          sender: socket.userId,
          receiver: to,
          conversationId,
          text: message.text,
          createdAt: message.createdAt,
        };

        // Deliver to the recipient (if online) and echo back to the sender
        io.to(to).emit("new_message", payload);
        io.to(socket.userId).emit("new_message", payload);

        callback?.({ success: true, message: payload });
      } catch (err) {
        callback?.({ error: "Couldn't send that message" });
      }
    });

    socket.on("typing", ({ to }) => {
      if (to) io.to(to).emit("typing", { from: socket.userId, username: socket.username });
    });

    socket.on("stop_typing", ({ to }) => {
      if (to) io.to(to).emit("stop_typing", { from: socket.userId });
    });
  });
};

module.exports = initSocket;
