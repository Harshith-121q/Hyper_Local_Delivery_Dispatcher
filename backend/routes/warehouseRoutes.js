import express from 'express';
import { getWarehouses, createWarehouse, seedHubs } from '../controllers/warehouseController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getWarehouses);
router.post('/', verifyToken, roleMiddleware('admin'), createWarehouse);
router.post('/seed', verifyToken, roleMiddleware('admin'), seedHubs);

export default router;
