const express = require("express");
const { getConversation, sendMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/:userId", getConversation);
router.post("/:userId", sendMessage);

module.exports = router;
