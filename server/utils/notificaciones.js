const pool = require('../config/db');
const correos = require('./correos');

// La llaman pedidosController, pagosController y boldController: los 3 lugares
// donde el estado de un pedido puede cambiar.
async function notificarCambioEstadoPedido(pedido_id, estado) {
    try {
        const [rows] = await pool.query(
            `SELECT u.email FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ?`,
            [pedido_id]
        );
        if (rows.length === 0) return;

        await correos.enviarCambioEstadoPedido(rows[0].email, pedido_id, estado);
    } catch (error) {
        console.error('No se pudo notificar el cambio de estado del pedido:', error.message);
    }
}

module.exports = { notificarCambioEstadoPedido };
