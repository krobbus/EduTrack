const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const classController = require('../controllers/classController');

router.use(verifyToken);

app.route('/')
  .get(authorizeRoles('admin', 'faculty', 'student'), classController.getClassHandler)
  .post(authorizeRoles('faculty'), classController.postClassHandler);

app.route('/:id')
  .get(authorizeRoles('admin', 'faculty', 'student'), classController.getClassIdHandler)
  .patch(authorizeRoles('faculty'), classController.patchClassIdHandler)
  .delete(authorizeRoles('admin', 'faculty'), classController.deleteClassIdHandler);

module.exports = router;