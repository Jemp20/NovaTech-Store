const pool = require('../config/db');

// GET /api/favoritos  (lista los favoritos del usuario logueado, con datos del producto)
exports.getFavoritos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const [rows] = await pool.query(
            `SELECT f.producto_id, f.creado_en, p.nombre, p.precio, p.imagen, p.stock, p.categoria_id
             FROM favoritos f
             JOIN productos p ON p.id = f.producto_id
             WHERE f.usuario_id = ?
             ORDER BY f.creado_en DESC`,
            [usuarioId]
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los favoritos' });
    }
};

// GET /api/favoritos/ids  (solo los ids, liviano, para pintar los corazones en el catálogo)
exports.getFavoritosIds = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const [rows] = await pool.query(
            'SELECT producto_id FROM favoritos WHERE usuario_id = ?',
            [usuarioId]
        );
        res.json(rows.map(r => r.producto_id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los favoritos' });
    }
};

// POST /api/favoritos/:productoId  (agregar a favoritos)
exports.agregarFavorito = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { productoId } = req.params;

        await pool.query(
            'INSERT IGNORE INTO favoritos (usuario_id, producto_id) VALUES (?, ?)',
            [usuarioId, productoId]
        );

        res.status(201).json({ mensaje: 'Agregado a favoritos' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar el favorito' });
    }
};

// DELETE /api/favoritos/:productoId  (quitar de favoritos)
exports.quitarFavorito = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { productoId } = req.params;

        await pool.query(
            'DELETE FROM favoritos WHERE usuario_id = ? AND producto_id = ?',
            [usuarioId, productoId]
        );

        res.json({ mensaje: 'Quitado de favoritos' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al quitar el favorito' });
    }
};
