const express = require("express");
const router = express.Router();

const { requireAnyUser } = require('../middleware/auth');
const { roomLookupLimiter } = require('../utils/rateLimiter');
const { createRoom, getRoom, deleteRoom } = require("../controllers/roomControllers");

router.post("/", createRoom);
router.get("/:slug", roomLookupLimiter, getRoom);
router.delete("/:slug", requireAnyUser, deleteRoom);

module.exports = router;
