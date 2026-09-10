import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getEnrollmentHandler,
  postEnrollmentHandler,
  patchEnrollmentIdHandler,
  deleteEnrollmentIdHandler,
} from '../controllers/enrollmentController.js';

const router = express.Router();

router.use(verifyToken);

router.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), getEnrollmentHandler)
  .post(authorizeRoles('admin', 'faculty', 'student'), postEnrollmentHandler);

router.route('/:id')
  .patch(authorizeRoles('admin', 'faculty'), patchEnrollmentIdHandler)
  .delete(authorizeRoles('admin', 'faculty', 'student'), deleteEnrollmentIdHandler);

export default router;