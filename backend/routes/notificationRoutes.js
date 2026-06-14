import express from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.put('/read', verifyToken, markAllAsRead);
router.put('/:id/read', verifyToken, markAsRead);

export default router;
