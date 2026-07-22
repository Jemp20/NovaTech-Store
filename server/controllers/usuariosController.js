const pool = require('../config/db');

// GET /api/usuarios  (solo admin) — lista de clientes con cuánto han comprado
exports.getUsuarios = async (req, res) => {
    try {
        const [usuarios] = await pool.query(`
            SELECT
                u.id, u.nombre, u.email, u.rol, u.creado_en,
                COUNT(p.id) AS total_pedidos,
                COALESCE(SUM(CASE WHEN p.estado != 'cancelado' THEN p.total ELSE 0 END), 0) AS total_comprado
            FROM usuarios u
            LEFT JOIN pedidos p ON p.usuario_id = u.id
            GROUP BY u.id
            ORDER BY u.creado_en DESC
        `);

        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
};

// GET /api/usuarios/perfil  (usuario autenticado: sus propios datos de contacto/envío)
exports.getPerfil = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            `SELECT id, nombre, email, telefono, documento_identidad, direccion, ciudad
             FROM usuarios WHERE id = ?`,
            [req.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuarios[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tu perfil' });
    }
};

// PUT /api/usuarios/perfil  (usuario autenticado: actualiza sus datos de contacto/envío)
// body esperado: { telefono?, documento_identidad?, direccion?, ciudad? }
exports.actualizarPerfil = async (req, res) => {
    try {
        const { telefono, documento_identidad, direccion, ciudad } = req.body;

        await pool.query(
            `UPDATE usuarios
             SET telefono = ?, documento_identidad = ?, direccion = ?, ciudad = ?
             WHERE id = ?`,
            [telefono || null, documento_identidad || null, direccion || null, ciudad || null, req.usuario.id]
        );

        res.json({ mensaje: 'Perfil actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar tu perfil' });
    }
};
