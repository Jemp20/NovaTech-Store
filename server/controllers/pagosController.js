const pool = require('../config/db');
const { notificarCambioEstadoPedido } = require('../utils/notificaciones');

// GET /api/pagos  (solo admin)
exports.getPagos = async (req, res) => {
    try {
        const [pagos] = await pool.query(`
            SELECT pg.*, pd.usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email
            FROM pagos pg
            JOIN pedidos pd ON pg.pedido_id = pd.id
            JOIN usuarios u ON pd.usuario_id = u.id
            ORDER BY pg.creado_en DESC
        `);

        res.json(pagos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los pagos' });
    }
};

// PUT /api/pagos/:id/estado  (solo admin)
// Si se aprueba el pago, también se marca el pedido como "pagado".
exports.actualizarEstadoPago = async (req, res) => {
    const conexion = await pool.getConnection();

    try {
        const { id } = req.params;
        const { estado, referencia_bold } = req.body;

        const estadosValidos = ['pendiente', 'aprobado', 'rechazado'];
        if (!estadosValidos.includes(estado)) {
            conexion.release();
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
            'UPDATE pagos SET estado = ?, referencia_bold = COALESCE(?, referencia_bold) WHERE id = ?',
            [estado, referencia_bold || null, id]
        );

        if (resultado.affectedRows === 0) {
            await conexion.rollback();
            conexion.release();
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        if (estado === 'aprobado') {
            const [[pago]] = await conexion.query('SELECT pedido_id FROM pagos WHERE id = ?', [id]);
            await conexion.query('UPDATE pedidos SET estado = ? WHERE id = ?', ['pagado', pago.pedido_id]);
            notificarCambioEstadoPedido(pago.pedido_id, 'pagado');
        }

        await conexion.commit();
        conexion.release();

        res.json({ mensaje: 'Estado del pago actualizado' });
    } catch (error) {
        await conexion.rollback();
        conexion.release();
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado del pago' });
    }
};
