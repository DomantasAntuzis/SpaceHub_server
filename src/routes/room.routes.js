const express = require("express");
const router = express.Router();

const { requireAnyUser } = require('../middleware/auth');
const { createRoom, getRoom, deleteRoom } = require("../controllers/roomControllers");

router.post("/", createRoom);
router.get("/:id", getRoom);
router.delete("/:id", requireAnyUser, deleteRoom);

module.exports = router;
