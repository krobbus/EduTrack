const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const enrollmentController = require('../controllers/enrollmentController');

router.use(verifyToken);

router.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), enrollmentController.getEnrollmentHandler)
  .post(authorizeRoles('admin', 'faculty', 'student'), enrollmentController.postEnrollmentHandler);

router.route('/:id')
  .patch(authorizeRoles('admin', 'faculty'), enrollmentController.patchEnrollmentIdHandler)
  .delete(authorizeRoles('admin', 'faculty', 'student'), enrollmentController.deleteEnrollmentIdHandler);

module.exports = router;