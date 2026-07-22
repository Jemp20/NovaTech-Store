const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/', verificarToken, esAdmin, usuariosController.getUsuarios);

module.exports = router;
