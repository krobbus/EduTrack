import express from 'express'
import verifyToken from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import classCheckHandler from '../middleware/classCheckHandler.js'
import {
    getAttendanceHandler,
    createAttendanceHandler,
    updateAttendanceHandler,
    deleteAttendanceHandler
} from '../controllers/attendanceController.js'

const router = express.Router()

router.use(verifyToken)

router.route('/')
    .get(authorizeRoles('admin', 'faculty', 'student'), classCheckHandler, getAttendanceHandler)
    .post(authorizeRoles('admin', 'faculty'), classCheckHandler, createAttendanceHandler)

router.route('/:id')
    .patch(authorizeRoles('admin', 'faculty'), classCheckHandler, updateAttendanceHandler)
    .delete(authorizeRoles('admin', 'faculty'), classCheckHandler, deleteAttendanceHandler)

export default router