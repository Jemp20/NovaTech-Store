const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/', categoriasController.getCategorias);
router.post('/', verificarToken, esAdmin, categoriasController.crearCategoria);
router.put('/:id', verificarToken, esAdmin, categoriasController.actualizarCategoria);
router.delete('/:id', verificarToken, esAdmin, categoriasController.eliminarCategoria);

module.exports = router;
