const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const cloudinary = require('../config/cloudinary');
const { verificarToken, esAdmin } = require('../middleware/auth');

// POST /api/upload  (campo del form-data: "imagen")
router.post('/', verificarToken, esAdmin, (req, res) => {
    upload.single('imagen')(req, res, async (error) => {
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        try {
            // Subimos el buffer (en memoria) directo a Cloudinary, sin tocar disco.
            const resultado = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'novatech-store' },
                    (err, resultadoSubida) => {
                        if (err) reject(err);
                        else resolve(resultadoSubida);
                    }
                );
                stream.end(req.file.buffer);
            });

            res.status(201).json({ url: resultado.secure_url });
        } catch (errorCloudinary) {
            console.error(errorCloudinary);
            res.status(500).json({ error: 'No se pudo subir la imagen' });
        }
    });
});

module.exports = router;
