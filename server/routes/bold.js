const express = require('express');
const router = express.Router();
const boldController = require('../controllers/boldController');
const { verificarToken } = require('../middleware/auth');

router.post('/preparar-boton/:pedido_id', verificarToken, boldController.prepararBotonPago);
router.post('/crear-link/:pedido_id', verificarToken, boldController.crearLinkPago);

// El webhook lo llama Bold directamente, no pasa por verificarToken
router.post('/webhook', boldController.recibirWebhook);

module.exports = router;
