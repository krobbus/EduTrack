import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getUserHandler,
  postUserHandler,
  getUserIdHandler,
  patchUserIdHandler,
  deleteUserIdHandler,
  resetPasswordHandler,
} from '../controllers/userController.js';

const router = express.Router();

router.use(verifyToken);

router.route('/')
  .get(authorizeRoles('admin'), getUserHandler)
  .post(authorizeRoles('admin'), postUserHandler);

router.route('/:id')
  .get(authorizeRoles('admin', 'faculty', 'student'), getUserIdHandler)
  .patch(authorizeRoles('admin'), patchUserIdHandler)
  .delete(authorizeRoles('admin'), deleteUserIdHandler);

router.patch('/:id/reset-password', authorizeRoles('admin'), resetPasswordHandler);

export default router;