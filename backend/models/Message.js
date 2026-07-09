const mongoose = require("mongoose");

// Messages auto-delete DATA_TTL_SECONDS (default 72h) after they were sent.
const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Sorted pair of user IDs, joined by "_" - makes it cheap to fetch a whole
    // conversation regardless of who sent which message.
    conversationId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

MessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: parseInt(process.env.DATA_TTL_SECONDS, 10) || 259200 }
);

MessageSchema.statics.buildConversationId = (id1, id2) => {
  return [id1.toString(), id2.toString()].sort().join("_");
};

module.exports = mongoose.model("Message", MessageSchema);
