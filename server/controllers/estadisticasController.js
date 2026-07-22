const pool = require('../config/db');

// GET /api/estadisticas  (solo admin)
exports.getEstadisticas = async (req, res) => {
    try {
        const [[resumen]] = await pool.query(`
            SELECT
                COUNT(*) AS total_pedidos,
                COALESCE(SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END), 0) AS total_ventas,
                COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pedidos_pendientes
            FROM pedidos
        `);

        const [[clientesRow]] = await pool.query(
            `SELECT COUNT(*) AS total_clientes FROM usuarios WHERE rol = 'cliente'`
        );

        const [masVendidos] = await pool.query(`
            SELECT p.id, p.nombre, p.imagen, SUM(pi.cantidad) AS unidades_vendidas
            FROM pedido_items pi
            JOIN productos p ON pi.producto_id = p.id
            JOIN pedidos pd ON pi.pedido_id = pd.id
            WHERE pd.estado != 'cancelado'
            GROUP BY p.id
            ORDER BY unidades_vendidas DESC
            LIMIT 5
        `);

        const [ventasPorDia] = await pool.query(`
            SELECT DATE(creado_en) AS fecha, SUM(total) AS total
            FROM pedidos
            WHERE estado != 'cancelado' AND creado_en >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            GROUP BY DATE(creado_en)
            ORDER BY fecha ASC
        `);

        res.json({
            total_pedidos: resumen.total_pedidos,
            total_ventas: Number(resumen.total_ventas),
            pedidos_pendientes: resumen.pedidos_pendientes,
            total_clientes: clientesRow.total_clientes,
            mas_vendidos: masVendidos,
            ventas_por_dia: ventasPorDia
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las estadísticas' });
    }
};
