const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/', verificarToken, esAdmin, estadisticasController.getEstadisticas);

module.exports = router;
