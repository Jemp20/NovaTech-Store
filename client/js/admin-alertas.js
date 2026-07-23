// Revisa periódicamente si llegaron pedidos nuevos mientras el admin tiene el panel abierto,
// y avisa con un sonido + un toast + un numerito en la pestaña "Pedidos".

let ultimoPedidoIdConocido = Number(localStorage.getItem("admin_ultimo_pedido_id")) || null;
let primeraRevisionPedidos = true;

// Chrome/Edge bloquean el audio hasta que el usuario interactúe con la página.
// Creamos el contexto una sola vez y lo "desbloqueamos" con el primer click.
let audioCtx = null;
document.addEventListener("click", () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}, { once: true });

async function revisarPedidosNuevos() {
    const usuario = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;
    if (!usuario || usuario.rol !== "admin") return;

    try {
        const pedidos = await fetchAutenticado(`${API_BASE}/pedidos`);
        if (!Array.isArray(pedidos) || pedidos.length === 0) return;

        const idMasReciente = Math.max(...pedidos.map(p => p.id));

        // La primera revisión solo establece la base, para no alertar de pedidos viejos al abrir el panel
        if (primeraRevisionPedidos) {
            if (ultimoPedidoIdConocido === null) {
                ultimoPedidoIdConocido = idMasReciente;
                localStorage.setItem("admin_ultimo_pedido_id", idMasReciente);
            }
            primeraRevisionPedidos = false;
            actualizarBadgePedidos(pedidos);
            return;
        }

        if (idMasReciente > ultimoPedidoIdConocido) {
            const nuevos = pedidos.filter(p => p.id > ultimoPedidoIdConocido);

            nuevos.forEach(p => {
                notificarToast(`🛎️ Nuevo pedido #${p.id} de ${p.usuario_nombre} · $${Number(p.total).toLocaleString()}`, "exito");
            });

            reproducirBeepAlerta();

            ultimoPedidoIdConocido = idMasReciente;
            localStorage.setItem("admin_ultimo_pedido_id", idMasReciente);

            // Si la pestaña "Pedidos" está abierta en este momento, refrescamos la tabla sola
            const panelPedidosVisible = document.getElementById("panel-pedidos")?.classList.contains("active");
            if (panelPedidosVisible && typeof cargarPedidosAdmin === "function") {
                cargarPedidosAdmin();
            }
        }

        actualizarBadgePedidos(pedidos);

    } catch (error) {
        console.error("Error revisando pedidos nuevos:", error);
    }
}

// Numerito rojo en la pestaña "Pedidos" con la cantidad de pedidos en estado "pendiente"
function actualizarBadgePedidos(pedidos) {
    const tabPedidos = document.querySelector('.admin-tab[data-tab="pedidos"]');
    if (!tabPedidos) return;

    const pendientes = pedidos.filter(p => p.estado === "pendiente").length;
    let badge = tabPedidos.querySelector(".admin-tab-badge");

    if (pendientes > 0) {
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "admin-tab-badge";
            tabPedidos.appendChild(badge);
        }
        badge.textContent = pendientes;
    } else if (badge) {
        badge.remove();
    }
}

// Genera un sonido de alerta con el navegador, sin necesitar ningún archivo de audio
function reproducirBeepAlerta() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        const ctx = audioCtx;

        const tocarTono = (frecuencia, inicio, duracion) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + inicio);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + inicio);
            osc.stop(ctx.currentTime + inicio + duracion);
        };

        tocarTono(880, 0, 0.35);
        tocarTono(1046, 0.18, 0.35);

    } catch (error) {
        console.error("No se pudo reproducir el sonido de alerta:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Pequeña espera para que admin.js confirme primero que el usuario es admin
    setTimeout(revisarPedidosNuevos, 1500);
    setInterval(revisarPedidosNuevos, 25000);
});
