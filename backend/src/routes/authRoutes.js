const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const authController = require('../controllers/authController');

router.use(verifyToken);

router.post('/register', authController.registerHandler);
router.post('/login', authController.loginHandler);

module.exports = router;