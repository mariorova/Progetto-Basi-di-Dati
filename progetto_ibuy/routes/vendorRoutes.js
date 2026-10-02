const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const verificaToken = require('../middlewares/authMiddleware');

router.get('/venditori', verificaToken, vendorController.getVenditori);
router.get('/venditori/:username', verificaToken, vendorController.getVenditoreByUsername);
router.get('/venditori/:username/prodotti', verificaToken, vendorController.getProdottiVenditore);
router.get('/venditori/:username/followers', verificaToken, vendorController.getFollowersVenditore);
router.post('/venditori/:username/followers', verificaToken, vendorController.seguiVenditore);
router.delete('/venditori/:username/followers', verificaToken, vendorController.smettiSeguireVenditore);
router.get('/profilo/seguiti', verificaToken, vendorController.getVenditoriSeguiti);

module.exports = router;