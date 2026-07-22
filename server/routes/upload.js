const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { verificarToken, esAdmin } = require('../middleware/auth');

// POST /api/upload  (campo del form-data: "imagen")
router.post('/', verificarToken, esAdmin, (req, res) => {
    upload.single('imagen')(req, res, (error) => {
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        // Ruta RELATIVA (no absoluta con host/protocolo) para que la imagen cargue
        // sin importar si se accede por localhost, ngrok, o el dominio final en producción.
        const urlPublica = `/uploads/${req.file.filename}`;
        res.status(201).json({ url: urlPublica });
    });
});

module.exports = router;
