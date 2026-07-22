const crypto = require('crypto');
const pool = require('../config/db');
const { notificarCambioEstadoPedido } = require('../utils/notificaciones');

const BOLD_BASE_URL = 'https://integrations.api.bold.co';

// POST /api/bold/preparar-boton/:pedido_id  (dueño del pedido o admin)
// Genera los datos que el frontend necesita para abrir el Botón de pagos
// personalizado de Bold (checkout.bold.co/library/boldPaymentButton.js).
exports.prepararBotonPago = async (req, res) => {
    try {
        const { pedido_id } = req.params;

        const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = pedidos[0];

        if (req.usuario.rol !== 'admin' && req.usuario.id !== pedido.usuario_id) {
            return res.status(403).json({ error: 'No tienes acceso a este pedido' });
        }

        if (pedido.estado === 'pagado') {
            return res.status(409).json({ error: 'Este pedido ya está pagado' });
        }

        const orderId = `pedido_${pedido_id}_${Date.now()}`;
        const amount = String(Math.round(Number(pedido.total)));
        const currency = 'COP';

        // El hash de integridad evita que alguien manipule el monto desde el navegador
        const integritySignature = crypto
            .createHash('sha256')
            .update(`${orderId}${amount}${currency}${process.env.BOLD_SECRET_KEY}`)
            .digest('hex');

        // Guardamos la referencia para poder identificar el pago cuando llegue el webhook
        await pool.query(
            'UPDATE pagos SET metodo = ?, referencia_bold = ? WHERE pedido_id = ?',
            ['Bold', orderId, pedido_id]
        );

        // Bold rechaza "localhost" como URL de redirección: solo se envía si es un dominio real
        const callbackUrl = process.env.BOLD_CALLBACK_URL;
        const esUrlLocal = !callbackUrl || callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1');
        const urlDestino = esUrlLocal ? null : `${callbackUrl}/pedido-confirmado.html?id=${pedido_id}`;

        res.json({
            orderId,
            amount,
            currency,
            apiKey: process.env.BOLD_API_KEY,
            integritySignature,
            description: `Pedido #${pedido_id} - NovaTech Store`,
            ...(urlDestino ? { redirectionUrl: urlDestino } : {})
        });

    } catch (error) {
        console.error('Error al preparar el botón de Bold:', error);
        res.status(500).json({ error: 'Error al preparar el pago' });
    }
};

// POST /api/bold/crear-link/:pedido_id  (dueño del pedido o admin)
// Genera un link de pago de Bold para un pedido ya existente y guarda la
// referencia en la tabla "pagos" para poder identificarlo cuando llegue el webhook.
exports.crearLinkPago = async (req, res) => {
    try {
        const { pedido_id } = req.params;

        const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = pedidos[0];

        if (req.usuario.rol !== 'admin' && req.usuario.id !== pedido.usuario_id) {
            return res.status(403).json({ error: 'No tienes acceso a este pedido' });
        }

        if (pedido.estado === 'pagado') {
            return res.status(409).json({ error: 'Este pedido ya está pagado' });
        }

        // Referencia única para poder identificar el pago cuando Bold nos notifique
        const reference = `pedido_${pedido_id}_${Date.now()}`;

        const respuesta = await fetch(`${BOLD_BASE_URL}/online/link/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `x-api-key ${process.env.BOLD_API_KEY}`
            },
            body: JSON.stringify({
                amount_type: 'CLOSE',
                amount: {
                    currency: 'COP',
                    total_amount: Math.round(Number(pedido.total))
                },
                reference,
                description: `Pedido #${pedido_id} - NovaTech Store`,
                callback_url: process.env.BOLD_CALLBACK_URL
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || datos.errors?.length) {
            console.error('Error de Bold:', datos);
            return res.status(502).json({ error: 'No se pudo generar el link de pago' });
        }

        // Guardamos la referencia en el pago pendiente que ya existe para este pedido
        await pool.query(
            'UPDATE pagos SET metodo = ?, referencia_bold = ? WHERE pedido_id = ?',
            ['Bold', reference, pedido_id]
        );

        res.json({ url: datos.payload.url });

    } catch (error) {
        console.error('Error al crear el link de pago:', error);
        res.status(500).json({ error: 'Error al conectar con Bold' });
    }
};

// POST /api/bold/webhook  (lo llama Bold, no el navegador del cliente)
// Debe responder 200 rápido y verificar la firma antes de confiar en el contenido.
exports.recibirWebhook = async (req, res) => {
    try {
        console.log('🔔 Webhook de Bold recibido:', JSON.stringify(req.body));
        const firmaRecibida = req.headers['x-bold-signature'] || '';
        const cuerpoCrudo = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);

        const codificado = Buffer.from(cuerpoCrudo, 'utf-8').toString('base64');
        const secreto = process.env.BOLD_SECRET_KEY || ''; // vacío en modo pruebas, según Bold
        const firmaCalculada = crypto
            .createHmac('sha256', secreto)
            .update(codificado)
            .digest('hex');

        const esValida =
            firmaRecibida.length === firmaCalculada.length &&
            crypto.timingSafeEqual(Buffer.from(firmaCalculada), Buffer.from(firmaRecibida));

        if (!esValida) {
            console.warn('Webhook de Bold con firma inválida');
            return res.status(400).json({ error: 'Firma inválida' });
        }

        const evento = req.body;
        const referencia = evento?.data?.metadata?.reference;

        if (!referencia) {
            // No podemos ubicar a qué pedido corresponde: confirmamos recepción igual
            return res.status(200).json({ recibido: true });
        }

        const [pagos] = await pool.query('SELECT * FROM pagos WHERE referencia_bold = ?', [referencia]);
        if (pagos.length === 0) {
            return res.status(200).json({ recibido: true });
        }

        const pago = pagos[0];

        // Idempotencia: si ya estaba aprobado, no lo volvemos a procesar
        if (evento.type === 'SALE_APPROVED' && pago.estado !== 'aprobado') {
            await pool.query('UPDATE pagos SET estado = ? WHERE id = ?', ['aprobado', pago.id]);
            await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', ['pagado', pago.pedido_id]);
            notificarCambioEstadoPedido(pago.pedido_id, 'pagado');
        } else if (evento.type === 'SALE_REJECTED' && pago.estado !== 'rechazado') {
            await pool.query('UPDATE pagos SET estado = ? WHERE id = ?', ['rechazado', pago.id]);
        }

        res.status(200).json({ recibido: true });

    } catch (error) {
        console.error('Error procesando webhook de Bold:', error);
        // Igual respondemos 200 para que Bold no reintente por un error nuestro de lógica
        res.status(200).json({ recibido: true });
    }
};
