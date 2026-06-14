import express from 'express';
import { updateStageStatus } from '../controllers/dispatchController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.put('/stage-status', verifyToken, roleMiddleware('agent', 'hub_driver', 'delivery_partner'), updateStageStatus);

export default router;
