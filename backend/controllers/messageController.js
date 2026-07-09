const Message = require("../models/Message");
const Friendship = require("../models/Friendship");

// Shared guard: only accepted friends may see/send messages to each other
const assertAreFriends = async (userId1, userId2) => {
  const { userA, userB } = Friendship.orderPair(userId1, userId2);
  const friendship = await Friendship.findOne({ userA, userB, status: "accepted" });
  return !!friendship;
};

// @route  GET /api/messages/:userId
const getConversation = async (req, res, next) => {
  try {
    const meId = req.user._id;
    const otherId = req.params.userId;

    const areFriends = await assertAreFriends(meId, otherId);
    if (!areFriends) {
      return res.status(403).json({ message: "You can only view chats with friends" });
    }

    const conversationId = Message.buildConversationId(meId, otherId);
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/messages/:userId  { text }
// REST fallback for sending - the frontend normally sends via socket.io,
// but this keeps the API usable without a live socket connection too.
const sendMessage = async (req, res, next) => {
  try {
    const meId = req.user._id;
    const otherId = req.params.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message can't be empty" });
    }

    const areFriends = await assertAreFriends(meId, otherId);
    if (!areFriends) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    const conversationId = Message.buildConversationId(meId, otherId);
    const message = await Message.create({
      sender: meId,
      receiver: otherId,
      conversationId,
      text: text.trim(),
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversation, sendMessage, assertAreFriends };
