// Allows registered users only. Guests and anonymous requests get 401.
const requireRegisteredUser = (req, res, next) => {
  if (req.session.user?.type !== "registered") {
    return res.status(401).json({msg: "unauthorized: No session. You should login"});
  }

  req.user = req.session.user;
  next();
};

// Allows registered users and guests. Anonymous requests get 401.
const requireAnyUser = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({msg: "unauthorized: No session"});
  }

  req.user = req.session.user;
  next();
};

module.exports = { requireRegisteredUser, requireAnyUser };
