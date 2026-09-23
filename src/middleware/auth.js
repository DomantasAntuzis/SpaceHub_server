const authenticate = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({msg: "unauthorized: No session. You should login"});
  }

  req.user = req.session.user;
  next();
};

module.exports = authenticate;