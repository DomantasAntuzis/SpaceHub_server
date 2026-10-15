const crypto = require("crypto");

// Creates a guest in the session if the request has none
function ensureSessionUser(req) {
  if (!req.session.user) {
    req.session.user = {
      type: 'guest',
      guestId: crypto.randomUUID(),
      username: `User_${crypto.randomInt(1000, 10000)}`
    };
  }
}

module.exports = ensureSessionUser;
