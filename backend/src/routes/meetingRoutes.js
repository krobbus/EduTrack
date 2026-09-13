import express from 'express'
import verifyToken from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import classCheckHandler from '../middleware/classCheckHandler.js'
import {
    getMeetingHandler,
    postMeetingHandler,
    patchMeetingIdHandler,
    deleteMeetingIdHandler
} from '../controllers/meetingController.js'

const router = express.Router()

router.use(verifyToken)

router.route('/')
    .get(authorizeRoles('admin', 'faculty', 'student'), classCheckHandler, getMeetingHandler)
    .post(authorizeRoles('admin', 'faculty'), classCheckHandler, postMeetingHandler);

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty'), patchMeetingIdHandler)
    .delete(authorizeRoles('admin', 'faculty'), deleteMeetingIdHandler);

export default router