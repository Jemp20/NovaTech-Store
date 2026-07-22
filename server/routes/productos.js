const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/', productosController.getProductos);
router.get('/:id', productosController.getProductoPorId);
router.post('/', verificarToken, esAdmin, productosController.crearProducto);
router.put('/:id', verificarToken, esAdmin, productosController.actualizarProducto);
router.delete('/:id', verificarToken, esAdmin, productosController.eliminarProducto);

module.exports = router;
