const nodemailer = require('nodemailer');

// Configuración genérica por SMTP. Para Gmail: host smtp.gmail.com, puerto 587,
// y EMAIL_PASS debe ser una "contraseña de aplicación" (no tu contraseña normal).
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true solo para el puerto 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = transporter;
