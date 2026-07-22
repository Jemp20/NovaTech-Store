const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/', verificarToken, esAdmin, pagosController.getPagos);
router.put('/:id/estado', verificarToken, esAdmin, pagosController.actualizarEstadoPago);

module.exports = router;
