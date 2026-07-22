// Bold, al redirigir de vuelta después del pago, ignora el path que le configuramos
// y siempre manda al dominio raíz con sus propios parámetros (bold-order-id, bold-tx-status).
// Este script detecta eso y redirige al cliente a la pantalla real de estado del pedido.
(function () {
    const params = new URLSearchParams(window.location.search);
    const boldOrderId = params.get("bold-order-id");

    if (!boldOrderId) return;

    // El orderId que generamos tiene el formato: pedido_54_1783880970916
    const coincidencia = boldOrderId.match(/^pedido_(\d+)_/);

    if (coincidencia) {
        const pedidoId = coincidencia[1];
        window.location.replace(`pedido-confirmado.html?id=${pedidoId}`);
    }
})();
