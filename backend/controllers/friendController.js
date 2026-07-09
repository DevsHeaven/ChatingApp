const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { getIO } = require("../sockets/ioInstance");

// @route  POST /api/friends/request  { username }
const sendRequest = async (req, res, next) => {
  try {
    const { username } = req.body;
    const meId = req.user._id;

    if (!username) {
      return res.status(400).json({ message: "Tell us who you want to add" });
    }

    const target = await User.findOne({ username: username.trim() });
    if (!target) {
      return res.status(404).json({ message: "No user with that username" });
    }
    if (target._id.toString() === meId.toString()) {
      return res.status(400).json({ message: "You can't friend request yourself" });
    }

    const { userA, userB } = Friendship.orderPair(meId, target._id);
    const existing = await Friendship.findOne({ userA, userB });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "You're already friends" });
      }
      return res.status(400).json({ message: "A request between you two is already pending" });
    }

    const friendship = await Friendship.create({
      userA,
      userB,
      requestedBy: meId,
      status: "pending",
    });

    // Notify the target in real time if they're online
    getIO()?.to(target._id.toString()).emit("friend_request_received", {
      friendshipId: friendship._id,
      from: { id: req.user._id, username: req.user.username },
    });

    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/friends/:id/accept
const acceptRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) return res.status(404).json({ message: "Request not found (it may have expired)" });

    const meId = req.user._id.toString();
    const isParticipant = [friendship.userA.toString(), friendship.userB.toString()].includes(meId);
    if (!isParticipant) return res.status(403).json({ message: "This request isn't yours to accept" });

    if (friendship.requestedBy.toString() === meId) {
      return res.status(400).json({ message: "You can't accept your own request" });
    }

    friendship.status = "accepted";
    await friendship.save();

    const otherId = friendship.userA.toString() === meId ? friendship.userB.toString() : friendship.userA.toString();
    getIO()?.to(otherId).emit("friend_request_accepted", {
      friendshipId: friendship._id,
      by: { id: req.user._id, username: req.user.username },
    });

    res.status(200).json({ message: "Friend request accepted", friendship });
  } catch (err) {
    next(err);
  }
};

// @route  DELETE /api/friends/:id
// Used for both rejecting a pending request and unfriending an accepted one
const removeFriendship = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) return res.status(404).json({ message: "Not found (it may have already expired)" });

    const meId = req.user._id.toString();
    const isParticipant = [friendship.userA.toString(), friendship.userB.toString()].includes(meId);
    if (!isParticipant) return res.status(403).json({ message: "Not authorized" });

    await friendship.deleteOne();
    res.status(200).json({ message: "Removed", id: req.params.id });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/friends  -> { friends, incoming, outgoing }
const listFriendships = async (req, res, next) => {
  try {
    const meId = req.user._id;
    const friendships = await Friendship.find({
      $or: [{ userA: meId }, { userB: meId }],
    }).populate("userA userB requestedBy", "username");

    const friends = [];
    const incoming = [];
    const outgoing = [];

    friendships.forEach((f) => {
      const other = f.userA._id.toString() === meId.toString() ? f.userB : f.userA;
      const entry = { friendshipId: f._id, user: { id: other._id, username: other.username }, createdAt: f.createdAt };

      if (f.status === "accepted") {
        friends.push(entry);
      } else if (f.requestedBy._id.toString() === meId.toString()) {
        outgoing.push(entry);
      } else {
        incoming.push(entry);
      }
    });

    res.status(200).json({ friends, incoming, outgoing });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendRequest, acceptRequest, removeFriendship, listFriendships };
