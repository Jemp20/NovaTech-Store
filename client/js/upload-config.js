const multer = require('multer');

function filtroArchivos(req, file, cb) {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
    }
}

// Ya no guardamos en disco (Render borra los archivos al reiniciar/dormir).
// Guardamos en memoria y de ahí se sube a Cloudinary (ver routes/upload.js).
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: filtroArchivos,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
});

module.exports = upload;
