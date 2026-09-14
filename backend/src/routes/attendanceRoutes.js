import express from 'express'
import verifyToken from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import {
    getAttendanceHandler,
    createAttendanceHandler,
    updateAttendanceHandler,
    deleteAttendanceHandler
} from '../controllers/attendanceController.js'

const router = express.Router()

router.use(verifyToken)

router.route('/')
    .get(authorizeRoles('admin', 'faculty', 'student'), getAttendanceHandler)
    .post(authorizeRoles('admin', 'faculty'), createAttendanceHandler)

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty'), updateAttendanceHandler)
    .delete(authorizeRoles('admin', 'faculty'), deleteAttendanceHandler)

export default router