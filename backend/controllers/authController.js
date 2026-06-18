import User from '../models/User.js';
import Agent from '../models/Agent.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRE } from '../config/env.js';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, location } = req.body;
    const registerableRoles = ['hub_driver', 'delivery_partner', 'customer'];
    const selectedRole = role || 'customer';

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required for registration.'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    if (!registerableRoles.includes(selectedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: customer, hub_driver, delivery_partner.'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: selectedRole,
      location: location || { lat: 12.9716, lng: 77.5946 }, // default Bangalore coordinates
      address: ''
    });

    const agentExists = await Agent.findOne({ email });
    if (['hub_driver', 'delivery_partner'].includes(selectedRole) && !agentExists) {
      await Agent.create({
        name,
        email,
        phone: 'N/A',
        role: selectedRole,
        currentLocation: user.location
      });
    }

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!email || !password) {
      console.warn('[Auth] Login failed: missing email or password', { email, hasPassword: Boolean(password) });
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!user) {
      console.warn('[Auth] Login failed: user not found', { email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.warn('[Auth] Login failed: wrong password', { email });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

export const updateMyLocation = async (req, res, next) => {
  try {
    const { location } = req.body;
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { location: { lat, lng } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Agent.findOneAndUpdate(
      { email: user.email },
      { currentLocation: { lat, lng } },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
