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
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    if (!registerableRoles.includes(selectedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Only Hub Driver and Delivery Partner accounts can be registered here'
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
    if (!agentExists) {
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

    if (user && (await user.matchPassword(password))) {
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
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
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
