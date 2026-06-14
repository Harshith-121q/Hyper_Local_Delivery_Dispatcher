import express from 'express';
import { registerUser, loginUser, getMe, updateMyLocation } from '../controllers/authController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getMe);
router.put('/location', verifyToken, updateMyLocation);

export default router;
