const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const dashboardController = require('../controllers/dashboard.controller');

router.get('/metrics', authMiddleware, roleMiddleware('tecnico', 'admin'), dashboardController.getMetrics);

module.exports = router;