const express = require("express");
const { listUsers } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", listUsers);

module.exports = router;
