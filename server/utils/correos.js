const transporter = require('../config/mailer');

const REMITENTE = `"NovaTech Store" <${process.env.EMAIL_USER}>`;

// Envuelve el envío en try/catch: si falla el correo, NUNCA debe tumbar
// la operación principal (registro, creación de pedido, etc.)
async function enviarCorreo(destinatario, asunto, html) {
    try {
        await transporter.sendMail({ from: REMITENTE, to: destinatario, subject: asunto, html });
    } catch (error) {
        console.error(`No se pudo enviar el correo a ${destinatario}:`, error.message);
    }
}

const plantillaBase = (contenido) => `
    <div style="font-family:Arial, sans-serif; max-width:520px; margin:auto; color:#111827;">
        ${contenido}
        <p style="margin-top:28px; color:#6b7280; font-size:13px;">— El equipo de NovaTech Store</p>
    </div>
`;

exports.enviarBienvenida = (destinatario, nombre) => {
    return enviarCorreo(destinatario, '¡Bienvenido a NovaTech Store! 👋', plantillaBase(`
        <h2 style="color:#2563EB;">¡Hola, ${nombre}!</h2>
        <p>Gracias por registrarte en <strong>NovaTech Store</strong>. Ya puedes explorar nuestros productos y armar tu pedido cuando quieras.</p>
    `));
};

exports.enviarPedidoCreado = (destinatario, pedido, items) => {
    const filas = items.map(it => `
        <tr>
            <td style="padding:8px 0; border-bottom:1px solid #f3f4f6;">${it.nombre}</td>
            <td style="padding:8px 0; border-bottom:1px solid #f3f4f6; text-align:center;">${it.cantidad}</td>
            <td style="padding:8px 0; border-bottom:1px solid #f3f4f6; text-align:right;">$${Number(it.precio).toLocaleString()}</td>
        </tr>
    `).join('');

    return enviarCorreo(destinatario, `Confirmación de tu pedido #${pedido.id}`, plantillaBase(`
        <h2 style="color:#2563EB;">¡Gracias por tu compra! 🛒</h2>
        <p>Tu pedido <strong>#${pedido.id}</strong> fue registrado correctamente.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <thead>
                <tr style="text-align:left; border-bottom:2px solid #e5e7eb;">
                    <th style="padding-bottom:8px;">Producto</th>
                    <th style="padding-bottom:8px;">Cant.</th>
                    <th style="padding-bottom:8px; text-align:right;">Precio</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
        <p style="text-align:right; font-size:18px; font-weight:bold; margin-top:16px;">
            Total: $${Number(pedido.total).toLocaleString()}
        </p>
        <p>Te avisaremos por aquí cada vez que tu pedido cambie de estado.</p>
    `));
};

const MENSAJES_ESTADO = {
    pagado: 'Confirmamos que recibimos tu pago. ¡Ya estamos preparando tu pedido! 💳',
    enviado: 'Tu pedido va en camino. 🚚',
    entregado: 'Tu pedido fue entregado. ¡Esperamos que lo disfrutes! 🎉',
    cancelado: 'Tu pedido fue cancelado. Si crees que esto es un error, contáctanos.'
};

exports.enviarCambioEstadoPedido = (destinatario, pedido_id, estado) => {
    return enviarCorreo(destinatario, `Actualización de tu pedido #${pedido_id}`, plantillaBase(`
        <h2 style="color:#2563EB;">Actualización de tu pedido #${pedido_id}</h2>
        <p>${MENSAJES_ESTADO[estado] || `Tu pedido cambió al estado: <strong>${estado}</strong>`}</p>
    `));
};
