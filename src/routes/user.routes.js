const express = require("express");
const router = express.Router();
const { requireRegisteredUser } = require('../middleware/auth');

router.post("/dashboard", requireRegisteredUser, (req, res) => {
  res.send("all good");
});

module.exports = router;