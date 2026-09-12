import express from 'express'
import { verifyToken } from '../middleware/authMiddleware'
import { authorizeRoles } from '../middleware/roleMiddleware'
import {
    getSubmissionHandler,
    postSubmissionHandler,
    patchSubmissionIdHandler,
    deleteSubmissionIdHandler
} from '../controllers/submissionController'

const router = express.Router()

router.use(verifyToken)

router.route('/')
    .get(authorizeRoles('admin', 'faculty', 'student'), getSubmissionHandler)
    .post(authorizeRoles('admin', 'faculty', 'student'), postSubmissionHandler);

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty', 'student'), patchSubmissionIdHandler)
    .delete(authorizeRoles('admin', 'faculty'), deleteSubmissionIdHandler);

export default router