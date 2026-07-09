const mongoose = require("mongoose");

// A single collection models both "friend request" and "accepted friendship".
// status: "pending" -> a request has been sent but not yet answered
//         "accepted" -> the two users are friends and can chat
// userA/userB are always stored with userA < userB (by ObjectId string) so
// there is only ever one document per pair, no matter who requested whom.
//
// TTL: this entire relationship (request or friendship) auto-deletes
// DATA_TTL_SECONDS after it was created - matching the 72h reset window.
const FriendshipSchema = new mongoose.Schema(
  {
    userA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });
FriendshipSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: parseInt(process.env.DATA_TTL_SECONDS, 10) || 259200 }
);

// Helper to always store the pair in a consistent order
FriendshipSchema.statics.orderPair = (id1, id2) => {
  const [a, b] = [id1.toString(), id2.toString()].sort();
  return { userA: a, userB: b };
};

module.exports = mongoose.model("Friendship", FriendshipSchema);
