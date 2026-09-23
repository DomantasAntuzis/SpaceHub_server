const express = require("express");
const router = express.Router();
const authenticate = require('../middleware/auth');

router.post("/dashboard", authenticate, (req, res) => {
  res.send("all good");
});

module.exports = router;