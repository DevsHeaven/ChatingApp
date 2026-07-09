const User = require("../models/User");
const Friendship = require("../models/Friendship");

// @route  GET /api/users?search=
// Returns other users, each annotated with the current relationship status
// so the frontend can show "Add friend" / "Pending" / "Friends" correctly.
const listUsers = async (req, res, next) => {
  try {
    const { search = "" } = req.query;
    const meId = req.user._id;

    const query = { _id: { $ne: meId } };
    if (search.trim()) {
      query.username = { $regex: search.trim(), $options: "i" };
    }

    const users = await User.find(query).limit(50).sort({ username: 1 });

    const friendships = await Friendship.find({
      $or: [{ userA: meId }, { userB: meId }],
    });

    const statusByUserId = {};
    friendships.forEach((f) => {
      const otherId = f.userA.toString() === meId.toString() ? f.userB.toString() : f.userA.toString();
      statusByUserId[otherId] = {
        status: f.status, // "pending" | "accepted"
        requestedByMe: f.requestedBy.toString() === meId.toString(),
        friendshipId: f._id,
      };
    });

    const result = users.map((u) => ({
      id: u._id,
      username: u.username,
      relationship: statusByUserId[u._id.toString()] || null,
    }));

    res.status(200).json({ users: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers };
