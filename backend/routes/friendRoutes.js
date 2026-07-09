const express = require("express");
const {
  sendRequest,
  acceptRequest,
  removeFriendship,
  listFriendships,
} = require("../controllers/friendController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", listFriendships);
router.post("/request", sendRequest);
router.post("/:id/accept", acceptRequest);
router.delete("/:id", removeFriendship);

module.exports = router;
