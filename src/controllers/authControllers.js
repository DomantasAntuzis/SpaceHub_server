const bcrypt = require("bcrypt");
const { User, Room } = require("../models");

const salt = 10;

// Creates a registered user and logs them in
async function register(req, res) {
  const {username, password} = req.body;

  try {
    const userExists = await User.findOne({ where: { username }});
    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({username, passwordHash});

    // a guest signing up keeps the rooms they created
    if (req.session.user?.type === 'guest') {
      await Room.update({ hostId: user.id, hostGuestId: null }, { where: { hostGuestId: req.session.user.guestId } });
    }

    req.session.user = { type: 'registered', id: user.id, username: user.username };

    res.status(201).json({ msg: 'User registered successfully' });
  } catch(error) {
    console.log(error);
    res.status(500).json({ msg: 'Error registering user', error });
  }
}

// Checks credentials and starts a registered-user session
async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // a guest logging in keeps the rooms they created (before regenerate wipes the guestId)
    if (req.session.user?.type === 'guest') {
      await Room.update({ hostId: user.id, hostGuestId: null }, { where: { hostGuestId: req.session.user.guestId } });
    }

    // new session id on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Login failed' });
      }

      req.session.user = { type: 'registered', id: user.id, username: user.username };

      req.session.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ msg: 'Login failed' });
        }
        res.json({ msg: 'Login successful', user: req.session.user });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error logging in' });
  }
}

// Destroys the session and clears the session cookie
function logout(req, res) {
  req.session.destroy((err) => {
    if(err){
      return res.status(500).json({msg: "Logout failed"});
    }
    res.clearCookie('connect.sid');
    res.json({msg: "Logout successful"});
  });
}

// Returns the current session user (registered or guest)
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, logout, me };