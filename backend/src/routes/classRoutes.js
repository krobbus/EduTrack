import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getClassHandler,
  getClassIdHandler,
  postClassHandler,
  patchClassIdHandler,
  deleteClassIdHandler,
} from '../controllers/classController.js';

const router = express.Router();

router.use(verifyToken);

router.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), getClassHandler)
  .post(authorizeRoles('faculty'), postClassHandler);

router.route('/:id')
  .get(authorizeRoles('admin', 'faculty', 'student'), getClassIdHandler)
  .patch(authorizeRoles('faculty'), patchClassIdHandler)
  .delete(authorizeRoles('admin', 'faculty'), deleteClassIdHandler);

export default router;