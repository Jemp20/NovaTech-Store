const express = require('express');
const router = express.Router();
const favoritosController = require('../controllers/favoritosController');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, favoritosController.getFavoritos);
router.get('/ids', verificarToken, favoritosController.getFavoritosIds);
router.post('/:productoId', verificarToken, favoritosController.agregarFavorito);
router.delete('/:productoId', verificarToken, favoritosController.quitarFavorito);

module.exports = router;
