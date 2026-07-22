const pool = require('../config/db');

// GET /api/categorias
exports.getCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las categorías' });
    }
};

// POST /api/categorias (solo admin)
exports.crearCategoria = async (req, res) => {
    try {
        const { nombre, slug } = req.body;

        if (!nombre || !slug) {
            return res.status(400).json({ error: 'Nombre y slug son obligatorios' });
        }

        const [resultado] = await pool.query(
            'INSERT INTO categorias (nombre, slug) VALUES (?, ?)',
            [nombre, slug]
        );

        res.status(201).json({ mensaje: 'Categoría creada', id: resultado.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
};

// PUT /api/categorias/:id (solo admin)
exports.actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, slug } = req.body;

        const [resultado] = await pool.query(
            'UPDATE categorias SET nombre=?, slug=? WHERE id=?',
            [nombre, slug, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json({ mensaje: 'Categoría actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
};

// DELETE /api/categorias/:id (solo admin)
exports.eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM categorias WHERE id=?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json({ mensaje: 'Categoría eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
};
