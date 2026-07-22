const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carpetaDestino = path.join(__dirname, '..', 'uploads');

// Crea la carpeta uploads si no existe
if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, carpetaDestino);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const nombreUnico = `producto-${Date.now()}${extension}`;
        cb(null, nombreUnico);
    }
});

function filtroArchivos(req, file, cb) {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
    }
}

const upload = multer({
    storage,
    fileFilter: filtroArchivos,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
});

module.exports = upload;
