const express = require('express');
const router = express.Router();
const cuponesController = require('../controllers/cuponesController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/validar/:codigo', verificarToken, cuponesController.validarCupon);
router.get('/', verificarToken, esAdmin, cuponesController.getCupones);
router.post('/', verificarToken, esAdmin, cuponesController.crearCupon);
router.put('/:id', verificarToken, esAdmin, cuponesController.actualizarCupon);
router.delete('/:id', verificarToken, esAdmin, cuponesController.eliminarCupon);

module.exports = router;
