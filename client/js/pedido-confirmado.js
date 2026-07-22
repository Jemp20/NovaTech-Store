// Usamos ruta RELATIVA (no http://localhost:3000) para evitar el bloqueo de "mixed content"
// cuando esta página se carga por HTTPS a través de ngrok.
// (nombre distinto a "API_URL" a propósito, porque auth.js ya usa ese nombre)
const API_PEDIDOS_URL = "/api/pedidos";

const ESTADOS_INFO = {
    pendiente: { icono: "fa-clock", color: "#d97706", texto: "Estamos confirmando tu pago con Bold. Esto puede tardar unos segundos." },
    pagado: { icono: "fa-circle-check", color: "#16a34a", texto: "¡Tu pago fue aprobado! Ya empezamos a preparar tu pedido." },
    enviado: { icono: "fa-truck", color: "#2563eb", texto: "Tu pedido va en camino." },
    entregado: { icono: "fa-box-open", color: "#16a34a", texto: "Tu pedido ya fue entregado." },
    cancelado: { icono: "fa-circle-xmark", color: "#dc2626", texto: "Este pedido fue cancelado." }
};

let intentos = 0;
const MAX_INTENTOS = 10; // ~30 segundos reintentando, por si el webhook de Bold tarda

function obtenerParametros() {
    return new URLSearchParams(window.location.search);
}

async function consultarEstadoPedido() {
    const contenedor = document.getElementById("estado-pedido-container");
    const params = obtenerParametros();
    const id = params.get("id");
    const boldOrderId = params.get("bold-order-id");

    if (!id) {
        contenedor.innerHTML = `<p>No se especificó ningún pedido.</p>`;
        return;
    }

    const token = typeof obtenerToken === "function" ? obtenerToken() : null;

    try {
        let pedido;

        if (token) {
            // Venimos con sesión activa en este mismo dominio: usamos la ruta normal
            const respuesta = await fetch(`${API_PEDIDOS_URL}/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!respuesta.ok) throw new Error("no-encontrado");
            pedido = await respuesta.json();

        } else if (boldOrderId) {
            // No hay sesión en este dominio (normal, Bold/ngrok es un origen distinto):
            // usamos la ruta pública, validada con la referencia de Bold como "llave"
            const respuesta = await fetch(`${API_PEDIDOS_URL}/${id}/estado-publico?ref=${encodeURIComponent(boldOrderId)}`);
            if (!respuesta.ok) throw new Error("no-encontrado");
            pedido = await respuesta.json();

        } else {
            contenedor.innerHTML = `
                <p>Necesitas iniciar sesión para ver el estado de tu pedido.</p>
                <a href="login.html" class="btn" style="margin-top:12px; display:inline-block;">Iniciar sesión</a>
            `;
            return;
        }

        renderizarEstado(pedido);

        // Si sigue pendiente, reintentamos cada 3 segundos por si el webhook de Bold
        // todavía no ha llegado (puede tardar unos segundos en confirmar el pago)
        if (pedido.estado === "pendiente" && intentos < MAX_INTENTOS) {
            intentos++;
            setTimeout(consultarEstadoPedido, 3000);
        }

    } catch (error) {
        console.error("Error al consultar el pedido:", error);
        contenedor.innerHTML = `<p>No se pudo encontrar el estado de ese pedido.</p>`;
    }
}

function renderizarEstado(pedido) {
    const contenedor = document.getElementById("estado-pedido-container");
    const info = ESTADOS_INFO[pedido.estado] || ESTADOS_INFO.pendiente;

    contenedor.innerHTML = `
        <i class="fa-solid ${info.icono}" style="font-size:56px; color:${info.color}; margin-bottom:16px;"></i>
        <h2 style="margin-bottom:8px;">Pedido #${pedido.id}</h2>
        <p style="color:#6b7280; margin-bottom:16px;">${info.texto}</p>
        <p style="font-size:20px; font-weight:800; margin-bottom:20px;">$${Number(pedido.total).toLocaleString()}</p>
        ${pedido.estado === "pendiente" ? `<p style="font-size:13px; color:#9ca3af;"><i class="fa-solid fa-spinner fa-spin"></i> Verificando...</p>` : ""}
        <a href="productos.html" class="btn" style="margin-top:16px; display:inline-block;">Seguir comprando</a>
    `;
}

document.addEventListener("DOMContentLoaded", consultarEstadoPedido);
