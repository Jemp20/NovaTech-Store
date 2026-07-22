// Sistema propio de notificaciones para reemplazar los alert() nativos del navegador.
// - notificarToast(mensaje, tipo): mensaje corto flotante (ej. "Producto agregado al carrito")
// - notificarModal(tituloHtml, cuerpoHtml): ventana con contenido más largo (ej. detalle de un pedido)

function _asegurarContenedorToast() {
    let contenedor = document.getElementById("toast-contenedor");
    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "toast-contenedor";
        document.body.appendChild(contenedor);
    }
    return contenedor;
}

// tipo: "info" (default), "exito", "error"
function notificarToast(mensaje, tipo = "info") {
    const contenedor = _asegurarContenedorToast();

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <i class="fa-solid ${tipo === "exito" ? "fa-circle-check" : tipo === "error" ? "fa-circle-exclamation" : "fa-circle-info"}"></i>
        <span>${mensaje}</span>
    `;

    contenedor.appendChild(toast);

    // Forzar reflow para que la animación de entrada se aplique
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    setTimeout(() => {
        toast.classList.remove("toast-visible");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 3000);
}

function notificarModal(tituloHtml, cuerpoHtml) {
    const anterior = document.getElementById("notif-modal-overlay");
    if (anterior) anterior.remove();

    const overlay = document.createElement("div");
    overlay.id = "notif-modal-overlay";
    overlay.className = "notif-modal-overlay";
    overlay.innerHTML = `
        <div class="notif-modal">
            <button class="notif-modal-cerrar" aria-label="Cerrar">&times;</button>
            <div class="notif-modal-titulo">${tituloHtml}</div>
            <div class="notif-modal-cuerpo">${cuerpoHtml}</div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("notif-modal-visible"));

    const cerrar = () => {
        overlay.classList.remove("notif-modal-visible");
        overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
    };

    overlay.querySelector(".notif-modal-cerrar").addEventListener("click", cerrar);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar();
    });
    document.addEventListener("keydown", function escHandler(e) {
        if (e.key === "Escape") {
            cerrar();
            document.removeEventListener("keydown", escHandler);
        }
    });
}

function notificarConfirmar(mensaje, textoAceptar = "Eliminar") {
    return new Promise((resolve) => {
        const anterior = document.getElementById("notif-modal-overlay");
        if (anterior) anterior.remove();

        const overlay = document.createElement("div");
        overlay.id = "notif-modal-overlay";
        overlay.className = "notif-modal-overlay";
        overlay.innerHTML = `
            <div class="notif-modal notif-modal-confirmar">
                <div class="notif-modal-titulo">Confirmar acción</div>
                <div class="notif-modal-cuerpo">${mensaje}</div>
                <div class="notif-modal-acciones">
                    <button class="notif-btn notif-btn-cancelar">Cancelar</button>
                    <button class="notif-btn notif-btn-aceptar">${textoAceptar}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("notif-modal-visible"));

        const cerrar = (resultado) => {
            overlay.classList.remove("notif-modal-visible");
            overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
            resolve(resultado);
        };

        overlay.querySelector(".notif-btn-aceptar").addEventListener("click", () => cerrar(true));
        overlay.querySelector(".notif-btn-cancelar").addEventListener("click", () => cerrar(false));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cerrar(false);
        });
    });
}
