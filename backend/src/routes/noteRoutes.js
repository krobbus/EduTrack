import express from 'express';
import verifyToken from '../middleware/authMiddleware';
import authorizeRoles from '../middleware/roleMiddleware';
import {
    getNoteHandler,
    postNoteHandler,
    pacthNoteIdHandler,
    deleteNoteIdHandler
} from '../controllers/noteController';

const router = express.Router();

router.use(verifyToken);

router.route('/')
    .get(authorizeRoles('admin', 'faculty', 'student'), getNoteHandler)
    .post(authorizeRoles('admin', 'faculty', 'student'), postNoteHandler)

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty', 'student'), patchNoteIdHandler)
    .delete(authorizeRoles('admin', 'faculty'), deleteNoteIdHandler)

export default router;