const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Todas las rutas de pedidos requieren estar logueado, EXCEPTO estado-publico
router.get('/:id/estado-publico', pedidosController.getEstadoPublico);
router.post('/', verificarToken, pedidosController.crearPedido);
router.get('/mis-pedidos', verificarToken, pedidosController.getMisPedidos);
router.get('/', verificarToken, esAdmin, pedidosController.getPedidos);
router.get('/:id', verificarToken, pedidosController.getPedidoPorId);
router.put('/:id/estado', verificarToken, esAdmin, pedidosController.actualizarEstadoPedido);
router.delete('/:id', verificarToken, esAdmin, pedidosController.eliminarPedido);

module.exports = router;
