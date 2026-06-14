import express from 'express';
import { getGodowns, createGodown, seedGodowns } from '../controllers/godownController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getGodowns);
router.post('/', verifyToken, roleMiddleware('admin'), createGodown);
router.post('/seed', verifyToken, roleMiddleware('admin'), seedGodowns);

export default router;
