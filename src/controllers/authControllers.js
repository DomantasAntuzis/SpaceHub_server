const bcrypt = require("bcrypt");
const { User } = require("../models");

const salt = 10;

async function register(req, res) {
  const {username, password} = req.body;

  console.log(req.body);

  try {
    const userExists = await User.findOne({ where: { username }});
    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, salt);
    await User.create({username, passwordHash});

    res.status(201).json({ msg: 'User registered successfully' });
  } catch(error) {
    console.log(error);
    res.status(500).json({ msg: 'Error registering user', error });
  }
}

async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Not sure
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Login failed' });
      }

      req.session.user = { id: user.id, username: user.username };

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

function logout(req, res) {
  req.session.destroy((err) => {
    if(err){
      return res.status(500).json({msg: "Logout failed"});
    }
    res.clearCookie('connect.sid');        
    res.json({msg: "logout succesful"});
  });
}
module.exports = { register, login, logout };