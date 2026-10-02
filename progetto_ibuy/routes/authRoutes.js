const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/utenti', authController.registraUtente);
router.post('/login', authController.loginUtente);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logoutUtente);

module.exports = router;