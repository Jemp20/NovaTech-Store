const pool = require('../config/db');

// GET /api/productos
exports.getProductos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los productos' });
    }
};

// GET /api/productos/:id
exports.getProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
};

// POST /api/productos (solo admin)
exports.crearProducto = async (req, res) => {
    try {
        const { nombre, descripcion, precio, stock, imagen, categoria_id, especificaciones, destacado } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }

        const especificacionesJson = especificaciones && Object.keys(especificaciones).length > 0
            ? JSON.stringify(especificaciones)
            : null;

        const [resultado] = await pool.query(
            'INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria_id, especificaciones, destacado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, precio, stock || 0, imagen, categoria_id, especificacionesJson, destacado ? 1 : 0]
        );

        res.status(201).json({ mensaje: 'Producto creado', id: resultado.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
};

// PUT /api/productos/:id (solo admin)
exports.actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, stock, imagen, categoria_id, especificaciones, destacado } = req.body;

        const especificacionesJson = especificaciones && Object.keys(especificaciones).length > 0
            ? JSON.stringify(especificaciones)
            : null;

        const [resultado] = await pool.query(
            'UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, imagen=?, categoria_id=?, especificaciones=?, destacado=? WHERE id=?',
            [nombre, descripcion, precio, stock, imagen, categoria_id, especificacionesJson, destacado ? 1 : 0, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ mensaje: 'Producto actualizado', debug_destacado: destacado, debug_id: id, debug_filas_afectadas: resultado.affectedRows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

// DELETE /api/productos/:id (solo admin)
exports.eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM productos WHERE id=?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};
