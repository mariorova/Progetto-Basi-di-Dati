const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const verificaToken = require('../middlewares/authMiddleware');

// Rotta pubblica: Chiunque può vedere o cercare i prodotti
router.get('/prodotti', productController.getProdotti);

// Rotta protetta: Solo un utente loggato (e verificato come venditore nel controller) può inserire prodotti
router.post('/prodotti', verificaToken, productController.creaProdotto);
// Aggiungi questa riga sotto alle altre rotte in routes/productRoutes.js
router.get('/prodotti/:id', productController.getProdottoById);

module.exports = router;