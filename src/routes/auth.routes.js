const express = require("express");
const router = express.Router();

const authenticate = require('../middleware/auth');
const rateLimiter = require('../utils/rateLimiter');

const { register, login, logout } = require("../controllers/authControllers");

router.post("/register", rateLimiter, register);
router.post("/login", rateLimiter, login);
router.post("/logout", authenticate, logout);

module.exports = router;