const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verificaToken = require('../middlewares/authMiddleware');

router.post('/acquisti', verificaToken, orderController.creaAcquisto);
router.get('/acquisti', verificaToken, orderController.getAcquisti);

module.exports = router;