const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireLogin, requireAdmin } = require('../utils/authMiddleware');

// Protects all admin routes with login and admin check 
router.use(requireLogin, requireAdmin); 

router.get('/users', adminController.getAllUsers);
router.post('/users/promote', adminController.promoteUser);
router.get('/logs', adminController.getLogs);
router.post('/reset-cache', adminController.resetCache);

module.exports = router;
