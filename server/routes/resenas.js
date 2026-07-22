const express = require('express');
const router = express.Router();
const resenasController = require('../controllers/resenasController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/admin/listar', verificarToken, esAdmin, resenasController.getResenasAdmin);
router.delete('/admin/:id', verificarToken, esAdmin, resenasController.eliminarResena);

router.get('/:productoId', resenasController.getResenas);
router.post('/:productoId', verificarToken, resenasController.crearResena);

module.exports = router;
