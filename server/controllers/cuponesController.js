const pool = require('../config/db');

// GET /api/cupones/validar/:codigo  (cualquier usuario logueado, para aplicarlo en el carrito)
exports.validarCupon = async (req, res) => {
    try {
        const { codigo } = req.params;

        const [cupones] = await pool.query(
            `SELECT codigo, porcentaje_descuento FROM cupones
             WHERE codigo = ? AND activo = TRUE
             AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE())`,
            [codigo.trim().toUpperCase()]
        );

        if (cupones.length === 0) {
            return res.status(404).json({ error: 'Cupón inválido o expirado' });
        }

        res.json(cupones[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al validar el cupón' });
    }
};

// GET /api/cupones  (solo admin)
exports.getCupones = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cupones ORDER BY creado_en DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los cupones' });
    }
};

// POST /api/cupones  (solo admin)
exports.crearCupon = async (req, res) => {
    try {
        const { codigo, porcentaje_descuento, activo, fecha_expiracion } = req.body;

        if (!codigo || !porcentaje_descuento) {
            return res.status(400).json({ error: 'Código y porcentaje de descuento son obligatorios' });
        }

        if (porcentaje_descuento <= 0 || porcentaje_descuento > 100) {
            return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
        }

        const [resultado] = await pool.query(
            'INSERT INTO cupones (codigo, porcentaje_descuento, activo, fecha_expiracion) VALUES (?, ?, ?, ?)',
            [codigo.trim().toUpperCase(), porcentaje_descuento, activo ?? true, fecha_expiracion || null]
        );

        res.status(201).json({ mensaje: 'Cupón creado', id: resultado.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un cupón con ese código' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al crear el cupón' });
    }
};

// PUT /api/cupones/:id  (solo admin)
exports.actualizarCupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, porcentaje_descuento, activo, fecha_expiracion } = req.body;

        const [resultado] = await pool.query(
            'UPDATE cupones SET codigo=?, porcentaje_descuento=?, activo=?, fecha_expiracion=? WHERE id=?',
            [codigo.trim().toUpperCase(), porcentaje_descuento, activo ?? true, fecha_expiracion || null, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cupón no encontrado' });
        }

        res.json({ mensaje: 'Cupón actualizado' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un cupón con ese código' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el cupón' });
    }
};

// DELETE /api/cupones/:id  (solo admin)
exports.eliminarCupon = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM cupones WHERE id=?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cupón no encontrado' });
        }

        res.json({ mensaje: 'Cupón eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el cupón' });
    }
};
