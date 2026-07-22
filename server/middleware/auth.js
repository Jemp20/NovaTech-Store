const jwt = require('jsonwebtoken');

// Verifica que venga un token válido
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload; // { id, rol }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

// Verifica que el usuario autenticado sea admin
function esAdmin(req, res, next) {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
}

module.exports = { verificarToken, esAdmin };
