const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @route  POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({ message: "That username is already taken" });
    }

    const user = await User.create({ username: username.trim(), password });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ user: { id: req.user._id, username: req.user.username } });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
