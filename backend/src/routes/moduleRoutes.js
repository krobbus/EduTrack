import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import classCheckHandler from '../middleware/classCheckHandler.js';
import {
  getModuleHandler,
  postModuleHandler,
  patchModuleIdHandler,
  deleteModuleIdHandler,
} from '../controllers/moduleController.js';

const router = express.Router();

router.use(verifyToken);

router.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), getModuleHandler)
  .post(authorizeRoles('admin', 'faculty'), classCheckHandler, postModuleHandler);

router.route('/:id')
  .patch(authorizeRoles('admin', 'faculty'), patchModuleIdHandler)
  .delete(authorizeRoles('admin', 'faculty'), deleteModuleIdHandler);

export default router;