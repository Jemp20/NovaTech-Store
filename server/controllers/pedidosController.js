const pool = require('../config/db');
const correos = require('../utils/correos');
const { notificarCambioEstadoPedido } = require('../utils/notificaciones');

// POST /api/pedidos  (cliente autenticado)
// body esperado: { items: [{ producto_id, cantidad }], cupon_codigo? }
exports.crearPedido = async (req, res) => {
    const conexion = await pool.getConnection();

    try {
        const { items, cupon_codigo, telefono_contacto, documento_identidad, direccion_envio, ciudad_envio, notas_entrega, metodo_pago } = req.body;
        const usuario_id = req.usuario.id;
        const metodoPagoFinal = metodo_pago === 'contraentrega' ? 'contraentrega' : 'online';

        if (!Array.isArray(items) || items.length === 0) {
            conexion.release();
            return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
        }

        // Los datos de envío son obligatorios para poder despachar el pedido
        if (!telefono_contacto || !documento_identidad || !direccion_envio || !ciudad_envio) {
            conexion.release();
            return res.status(400).json({ error: 'Faltan datos de envío: teléfono, documento, dirección y ciudad son obligatorios' });
        }

        await conexion.beginTransaction();

        // 1. Traer precios y stock reales desde la BD (nunca confiar en el precio del cliente)
        const idsProductos = items.map(item => item.producto_id);
        const [productosDb] = await conexion.query(
            `SELECT id, nombre, precio, stock FROM productos WHERE id IN (${idsProductos.map(() => '?').join(',')})`,
            idsProductos
        );

        if (productosDb.length !== idsProductos.length) {
            await conexion.rollback();
            conexion.release();
            return res.status(400).json({ error: 'Uno o más productos ya no existen' });
        }

        // 2. Validar stock y calcular el total
        let total = 0;
        const itemsParaInsertar = [];

        for (const item of items) {
            const producto = productosDb.find(p => p.id === item.producto_id);
            const cantidad = Number(item.cantidad) || 0;

            if (cantidad <= 0) {
                await conexion.rollback();
                conexion.release();
                return res.status(400).json({ error: `Cantidad inválida para ${producto.nombre}` });
            }

            if (producto.stock < cantidad) {
                await conexion.rollback();
                conexion.release();
                return res.status(409).json({ error: `Stock insuficiente para ${producto.nombre}` });
            }

            total += Number(producto.precio) * cantidad;
            itemsParaInsertar.push({
                producto_id: producto.id,
                cantidad,
                precio_unitario: producto.precio
            });
        }

        // 3. Validar y aplicar el cupón (si se envió uno)
        let cupon_id = null;

        if (cupon_codigo) {
            const [cupones] = await conexion.query(
                `SELECT * FROM cupones
                 WHERE codigo = ? AND activo = TRUE
                 AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE())`,
                [cupon_codigo]
            );

            if (cupones.length === 0) {
                await conexion.rollback();
                conexion.release();
                return res.status(400).json({ error: 'Cupón inválido o expirado' });
            }

            const cupon = cupones[0];
            cupon_id = cupon.id;
            total = total - (total * (Number(cupon.porcentaje_descuento) / 100));
        }

        // 4. Crear el pedido
        const [resultadoPedido] = await conexion.query(
            `INSERT INTO pedidos
                (usuario_id, total, cupon_id, telefono_contacto, documento_identidad, direccion_envio, ciudad_envio, notas_entrega, metodo_pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuario_id, total.toFixed(2), cupon_id, telefono_contacto, documento_identidad, direccion_envio, ciudad_envio, notas_entrega || null, metodoPagoFinal]
        );
        const pedido_id = resultadoPedido.insertId;

        // 5. Insertar los items del pedido y descontar stock
        for (const item of itemsParaInsertar) {
            await conexion.query(
                'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [pedido_id, item.producto_id, item.cantidad, item.precio_unitario]
            );

            await conexion.query(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [item.cantidad, item.producto_id]
            );
        }

        // 6. Si el cliente eligió pagar en línea, creamos el registro de pago pendiente
        //    (se actualizará cuando Bold confirme). Contraentrega no pasa por Bold, así que no aplica.
        if (metodoPagoFinal === 'online') {
            await conexion.query(
                'INSERT INTO pagos (pedido_id, monto, metodo, estado) VALUES (?, ?, ?, ?)',
                [pedido_id, total.toFixed(2), 'Bold', 'pendiente']
            );
        }

        await conexion.commit();
        conexion.release();

        res.status(201).json({ mensaje: 'Pedido creado', pedido_id, total: Number(total.toFixed(2)) });

        // Correo de confirmación (no bloquea la respuesta ni afecta el pedido si falla)
        const [[usuarioInfo]] = await pool.query('SELECT nombre, email FROM usuarios WHERE id = ?', [usuario_id]);
        if (usuarioInfo) {
            const itemsCorreo = itemsParaInsertar.map(it => ({
                nombre: productosDb.find(p => p.id === it.producto_id)?.nombre || 'Producto',
                cantidad: it.cantidad,
                precio: it.precio_unitario * it.cantidad
            }));
            correos.enviarPedidoCreado(usuarioInfo.email, { id: pedido_id, total }, itemsCorreo);
        }

    } catch (error) {
        await conexion.rollback();
        conexion.release();
        console.error(error);
        res.status(500).json({ error: 'Error al crear el pedido' });
    }
};

// GET /api/pedidos/mis-pedidos  (cliente autenticado: su propio historial)
exports.getMisPedidos = async (req, res) => {
    try {
        const usuario_id = req.usuario.id;

        const [pedidos] = await pool.query(
            'SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY creado_en DESC',
            [usuario_id]
        );

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tus pedidos' });
    }
};

// GET /api/pedidos  (solo admin: todos los pedidos)
exports.getPedidos = async (req, res) => {
    try {
        const [pedidos] = await pool.query(`
            SELECT p.*, u.nombre AS usuario_nombre, u.email AS usuario_email
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.creado_en DESC
        `);

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
};

// GET /api/pedidos/:id  (admin, o el dueño del pedido)
// GET /api/pedidos/:id/estado-publico?ref=xxxx  (SIN sesión — para la pantalla de retorno de Bold)
// Solo devuelve datos mínimos, y solo si la referencia de Bold coincide con la guardada,
// para que no cualquiera pueda consultar el estado de cualquier pedido con solo el número.
exports.getEstadoPublico = async (req, res) => {
    try {
        const { id } = req.params;
        const { ref } = req.query;

        if (!ref) {
            return res.status(400).json({ error: 'Falta la referencia del pago' });
        }

        const [pedidos] = await pool.query(
            `SELECT p.id, p.estado, p.total
             FROM pedidos p
             JOIN pagos pa ON pa.pedido_id = p.id
             WHERE p.id = ? AND pa.referencia_bold = ?`,
            [id, ref]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json(pedidos[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar el pedido' });
    }
};

exports.getPedidoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [pedidos] = await pool.query(
            `SELECT p.*, u.nombre AS usuario_nombre, u.email AS usuario_email
             FROM pedidos p
             JOIN usuarios u ON p.usuario_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = pedidos[0];

        // Un cliente solo puede ver su propio pedido; el admin puede ver cualquiera
        if (req.usuario.rol !== 'admin' && req.usuario.id !== pedido.usuario_id) {
            return res.status(403).json({ error: 'No tienes acceso a este pedido' });
        }

        const [items] = await pool.query(
            `SELECT pi.*, p.nombre AS producto_nombre, p.imagen AS producto_imagen
             FROM pedido_items pi
             JOIN productos p ON pi.producto_id = p.id
             WHERE pi.pedido_id = ?`,
            [id]
        );

        res.json({ ...pedido, items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el pedido' });
    }
};

// PUT /api/pedidos/:id/estado  (solo admin)
exports.actualizarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const [resultado] = await pool.query(
            'UPDATE pedidos SET estado = ? WHERE id = ?',
            [estado, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json({ mensaje: 'Estado del pedido actualizado' });
        notificarCambioEstadoPedido(id, estado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
    }
};

// DELETE /api/pedidos/:id  (solo admin)
exports.eliminarPedido = async (req, res) => {
    const conexion = await pool.getConnection();

    try {
        const { id } = req.params;

        await conexion.beginTransaction();

        // pedido_items se borra solo (ON DELETE CASCADE), pero pagos no tiene
        // esa relación en cascada, así que hay que borrarlo primero a mano.
        await conexion.query('DELETE FROM pagos WHERE pedido_id = ?', [id]);
        const [resultado] = await conexion.query('DELETE FROM pedidos WHERE id = ?', [id]);

        if (resultado.affectedRows === 0) {
            await conexion.rollback();
            conexion.release();
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        await conexion.commit();
        conexion.release();

        res.json({ mensaje: 'Pedido eliminado' });
    } catch (error) {
        await conexion.rollback();
        conexion.release();
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el pedido' });
    }
};
