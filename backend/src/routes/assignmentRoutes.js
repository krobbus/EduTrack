import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import classCheckHandler from '../middleware/classCheckHandler.js';
import {
  getAssignmentHandler,
  postAssignmentHandler,
  patchAssignmentIdHandler,
  deleteAssignmentIdHandler,
} from '../controllers/assignmentController.js';

const router = express.Router();

router.use(verifyToken)

router.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), classCheckHandler, getAssignmentHandler)
  .post(authorizeRoles('admin', 'faculty'), classCheckHandler, postAssignmentHandler);

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty'), patchAssignmentIdHandler)
    .delete(authorizeRoles('admin', 'faculty'), deleteAssignmentIdHandler);

export default router;