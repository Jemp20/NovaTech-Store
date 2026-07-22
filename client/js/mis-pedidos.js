const PEDIDOS_API_URL = "/api/pedidos";

const ESTADOS_LABEL = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado"
};

async function iniciarMisPedidos() {
    const usuario = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;
    const denegado = document.getElementById("mp-denegado");
    const contenido = document.getElementById("mp-content");

    if (!usuario) {
        denegado.style.display = "block";
        contenido.style.display = "none";
        return;
    }

    denegado.style.display = "none";
    contenido.style.display = "block";

    cargarMisPedidos();
}

async function cargarMisPedidos() {
    const lista = document.getElementById("mp-lista");
    const token = obtenerToken();

    try {
        const respuesta = await fetch(`${PEDIDOS_API_URL}/mis-pedidos`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const pedidos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(pedidos.error || "No se pudieron cargar tus pedidos");
        }

        if (pedidos.length === 0) {
            lista.innerHTML = `
                <div class="mp-empty">
                    Todavía no has hecho ningún pedido.<br>
                    <a href="productos.html">Explora nuestros productos →</a>
                </div>
            `;
            return;
        }

        lista.innerHTML = pedidos.map(p => `
            <div class="mp-card" onclick="verDetalleMiPedido(${p.id})">
                <div class="mp-card-info">
                    <span class="mp-card-numero">Pedido #${p.id}</span>
                    <span class="mp-card-fecha">${new Date(p.creado_en).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div class="mp-card-derecha">
                    <span class="mp-badge ${p.estado}">${ESTADOS_LABEL[p.estado] || p.estado}</span>
                    <span class="mp-card-total">$${Number(p.total).toLocaleString()}</span>
                    <i class="fa-solid fa-chevron-right mp-card-flecha"></i>
                </div>
            </div>
        `).join("");

    } catch (error) {
        lista.innerHTML = `<div class="mp-empty">${error.message}</div>`;
    }
}

async function verDetalleMiPedido(id) {
    const token = obtenerToken();

    try {
        const respuesta = await fetch(`${PEDIDOS_API_URL}/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const pedido = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(pedido.error || "No se pudo cargar el detalle del pedido");
        }

        const detalleHtml = pedido.items
            .map(it => `
                <div class="modal-producto-item">
                    <span>${it.producto_nombre} x${it.cantidad}</span>
                    <span>$${Number(it.precio_unitario).toLocaleString()} c/u</span>
                </div>
            `)
            .join("");

        notificarModal(
            `Pedido #${pedido.id}`,
            `
                <div class="modal-fila"><span>Estado</span><strong>${ESTADOS_LABEL[pedido.estado] || pedido.estado}</strong></div>
                <div class="modal-fila"><span>Total</span><strong>$${Number(pedido.total).toLocaleString()}</strong></div>
                <div class="modal-fila"><span>Fecha</span><strong>${new Date(pedido.creado_en).toLocaleDateString("es-CO")}</strong></div>

                <div class="modal-productos-titulo">Datos de envío</div>
                <div class="modal-fila"><span>Dirección</span><strong>${pedido.direccion_envio || "—"}</strong></div>
                <div class="modal-fila"><span>Ciudad</span><strong>${pedido.ciudad_envio || "—"}</strong></div>
                <div class="modal-fila"><span>Teléfono</span><strong>${pedido.telefono_contacto || "—"}</strong></div>
                ${pedido.notas_entrega ? `<div class="modal-fila"><span>Notas</span><strong>${pedido.notas_entrega}</strong></div>` : ""}

                <div class="modal-productos-titulo">Productos</div>
                ${detalleHtml}
            `
        );

    } catch (error) {
        notificarToast(error.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", iniciarMisPedidos);

// Revisa cada 15 segundos si algún pedido cambió de estado (ej. el admin lo marcó
// como "pagado" o "enviado"), para que el cliente lo vea sin tener que recargar la página.
setInterval(() => {
    const usuario = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;
    if (usuario) cargarMisPedidos();
}, 15000);
