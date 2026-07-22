const pool = require('../config/db');

// GET /api/resenas/:productoId  (lista + promedio)
exports.getResenas = async (req, res) => {
    try {
        const { productoId } = req.params;

        const [resenas] = await pool.query(
            `SELECT r.id, r.calificacion, r.comentario, r.creado_en, r.compra_verificada, u.nombre AS usuario_nombre
             FROM resenas r
             JOIN usuarios u ON u.id = r.usuario_id
             WHERE r.producto_id = ?
             ORDER BY r.creado_en DESC`,
            [productoId]
        );

        const promedio = resenas.length
            ? resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length
            : 0;

        res.json({ resenas, promedio: Number(promedio.toFixed(1)), total: resenas.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
};

// POST /api/resenas/:productoId  (crear o actualizar la reseña del usuario logueado)
// Solo se permite si el usuario tiene una compra pagada/enviada/entregada de ese producto.
exports.crearResena = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { productoId } = req.params;
        const { calificacion, comentario } = req.body;

        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
        }

        const [compras] = await pool.query(
            `SELECT pi.id FROM pedido_items pi
             JOIN pedidos p ON p.id = pi.pedido_id
             WHERE p.usuario_id = ? AND pi.producto_id = ?
               AND p.estado IN ('pagado','enviado','entregado')
             LIMIT 1`,
            [usuarioId, productoId]
        );

        if (compras.length === 0) {
            return res.status(403).json({ error: 'Solo puedes reseñar productos que hayas comprado' });
        }

        await pool.query(
            `INSERT INTO resenas (producto_id, usuario_id, calificacion, comentario, compra_verificada)
             VALUES (?, ?, ?, ?, TRUE)
             ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion), comentario = VALUES(comentario)`,
            [productoId, usuarioId, calificacion, comentario || null]
        );

        res.status(201).json({ mensaje: 'Reseña guardada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la reseña' });
    }
};

// GET /api/resenas/admin/listar  (todas las reseñas, para el panel de admin)
exports.getResenasAdmin = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.id, r.calificacion, r.comentario, r.creado_en, r.compra_verificada,
                    u.nombre AS usuario_nombre, p.nombre AS producto_nombre
             FROM resenas r
             JOIN usuarios u ON u.id = r.usuario_id
             JOIN productos p ON p.id = r.producto_id
             ORDER BY r.creado_en DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
};

// DELETE /api/resenas/admin/:id  (borrar una reseña, solo admin)
exports.eliminarResena = async (req, res) => {
    try {
        await pool.query('DELETE FROM resenas WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Reseña eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la reseña' });
    }
};
