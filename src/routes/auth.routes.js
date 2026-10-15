const express = require("express");
const router = express.Router();

const { requireRegisteredUser, requireAnyUser } = require('../middleware/auth');
const rateLimiter = require('../utils/rateLimiter');

const { register, login, logout, me } = require("../controllers/authControllers");

router.post("/register", rateLimiter, register);
router.post("/login", rateLimiter, login);
router.post("/logout", requireRegisteredUser, logout);
router.get("/me", requireAnyUser, me);

module.exports = router;