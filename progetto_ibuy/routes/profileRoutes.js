const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const verificaToken = require('../middlewares/authMiddleware');

router.get('/profilo', verificaToken, profileController.getProfilo);
router.patch('/profilo', verificaToken, profileController.patchProfilo);

module.exports = router;