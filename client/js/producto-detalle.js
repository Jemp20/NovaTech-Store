const PRODUCTO_API_URL = "/api/productos";

let productoActual = null;
let cantidadSeleccionada = 1;

function obtenerIdDeLaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function cargarProducto() {
    const contenedor = document.getElementById("producto-detalle-container");
    const id = obtenerIdDeLaUrl();

    if (!id) {
        contenedor.innerHTML = `<p class="producto-error">No se especificó ningún producto.</p>`;
        return;
    }

    try {
        const respuesta = await fetch(`${PRODUCTO_API_URL}/${id}`);

        if (!respuesta.ok) {
            contenedor.innerHTML = `<p class="producto-error">No se encontró ese producto.</p>`;
            return;
        }

        productoActual = await respuesta.json();
        renderizarProducto(productoActual);

    } catch (error) {
        console.error("Error al cargar el producto:", error);
        contenedor.innerHTML = `<p class="producto-error">No se pudo conectar con el servidor. ¿Está corriendo?</p>`;
    }
}

// Normaliza especificaciones, que pueden llegar como objeto o como string JSON
function normalizarEspecificaciones(especificaciones) {
    let datos = especificaciones;

    if (typeof datos === "string") {
        try { datos = JSON.parse(datos); } catch { datos = {}; }
    }

    return datos && typeof datos === "object" ? datos : {};
}

function renderizarProducto(producto) {
    const contenedor = document.getElementById("producto-detalle-container");
    const especificaciones = normalizarEspecificaciones(producto.especificaciones);
    const filasEspecificaciones = Object.entries(especificaciones);
    const hayStock = producto.stock > 0;
    const stockBajo = hayStock && producto.stock <= 5;

    document.title = `${producto.nombre} | NovaTech Store`;

    contenedor.innerHTML = `
        <div class="producto-detalle-grid">

            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-detalle-imagen">

            <div class="producto-detalle-info">

                ${producto.categoria_nombre ? `<span class="producto-detalle-categoria">${producto.categoria_nombre}</span>` : ""}

                <h1 class="producto-detalle-nombre">${producto.nombre}</h1>

                <p class="producto-detalle-precio">$${Number(producto.precio).toLocaleString()}</p>

                <p class="producto-detalle-stock ${!hayStock ? "agotado" : stockBajo ? "bajo" : "disponible"}">
                    <i class="fa-solid ${!hayStock ? "fa-circle-xmark" : stockBajo ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>
                    ${!hayStock ? "Agotado" : stockBajo ? `¡Solo quedan ${producto.stock} unidades!` : `${producto.stock} unidades disponibles`}
                </p>

                ${producto.descripcion ? `<p class="producto-detalle-descripcion">${producto.descripcion}</p>` : ""}

                <div class="producto-detalle-acciones">
                    <div class="producto-detalle-cantidad">
                        <button type="button" id="btn-restar-cantidad">-</button>
                        <span id="texto-cantidad">1</span>
                        <button type="button" id="btn-sumar-cantidad">+</button>
                    </div>

                    <button class="btn producto-detalle-agregar" id="btn-agregar-detalle" ${hayStock ? "" : "disabled"}>
                        <i class="fa-solid fa-cart-plus"></i> Agregar al carrito
                    </button>

                    <button class="btn-favorito btn-favorito-detalle" data-producto-id="${producto.id}" title="Agregar a favoritos">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>

                ${filasEspecificaciones.length > 0 ? `
                    <div class="producto-especificaciones">
                        <h3>Especificaciones técnicas</h3>
                        <table class="producto-especificaciones-tabla">
                            ${filasEspecificaciones.map(([nombre, valor]) => `
                                <tr>
                                    <td>${nombre}</td>
                                    <td>${valor}</td>
                                </tr>
                            `).join("")}
                        </table>
                    </div>
                ` : ""}

            </div>
        </div>
    `;

    cantidadSeleccionada = 1;

    document.getElementById("btn-restar-cantidad").addEventListener("click", () => cambiarCantidad(-1));
    document.getElementById("btn-sumar-cantidad").addEventListener("click", () => cambiarCantidad(1));
    document.getElementById("btn-agregar-detalle").addEventListener("click", agregarProductoActualAlCarrito);

    if (typeof pintarBotonesFavoritos === "function") pintarBotonesFavoritos();
    cargarRelacionados(producto);
    cargarResenas(producto.id);
}

function cambiarCantidad(delta) {
    const nueva = cantidadSeleccionada + delta;
    const maximo = productoActual?.stock ?? 1;

    if (nueva < 1 || nueva > maximo) return;

    cantidadSeleccionada = nueva;
    document.getElementById("texto-cantidad").textContent = cantidadSeleccionada;
}

function agregarProductoActualAlCarrito() {
    if (!productoActual) return;

    const carrito = obtenerCarrito();
    const existente = carrito.find(item => item.id === productoActual.id);

    if (existente) {
        existente.cantidad += cantidadSeleccionada;
    } else {
        carrito.push({
            id: productoActual.id,
            nombre: productoActual.nombre,
            precio: Number(productoActual.precio),
            imagen: productoActual.imagen,
            cantidad: cantidadSeleccionada
        });
    }

    guardarCarrito(carrito);
    notificarToast(`${productoActual.nombre} agregado al carrito`, "exito");
}

document.addEventListener("DOMContentLoaded", cargarProducto);

// ---- Productos relacionados (misma categoría) ----
async function cargarRelacionados(producto) {
    const cont = document.getElementById("relacionados-container");
    try {
        const resp = await fetch("/api/productos");
        const todos = await resp.json();
        const relacionados = todos
            .filter(p => p.categoria_id === producto.categoria_id && p.id !== producto.id)
            .slice(0, 4);

        if (relacionados.length === 0) { cont.innerHTML = ""; return; }

        cont.innerHTML = `
            <h2 class="section-title">Productos relacionados</h2>
            <div class="product-grid">
                ${relacionados.map(p => `
                    <div class="card">
                        <a href="producto.html?id=${p.id}" class="card-link-imagen">
                            <img src="${p.imagen}" alt="${p.nombre}">
                        </a>
                        <a href="producto.html?id=${p.id}" class="card-link-nombre"><h3>${p.nombre}</h3></a>
                        <p>$${Number(p.precio).toLocaleString()}</p>
                        <button onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio}, '${p.imagen}')">Agregar al carrito</button>
                    </div>
                `).join("")}
            </div>
        `;
    } catch (e) { console.error(e); }
}

// ---- Reseñas ----
function estrellas(n) {
    return Array.from({length:5}, (_,i) => `<i class="fa-solid fa-star" style="color:${i < n ? '#F59E0B' : 'var(--border-soft)'}"></i>`).join("");
}

async function cargarResenas(productoId) {
    const cont = document.getElementById("resenas-container");
    try {
        const resp = await fetch(`/api/resenas/${productoId}`);
        const { resenas, promedio, total } = await resp.json();

        const usuario = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;

        cont.innerHTML = `
            <div class="resenas-panel">
                <span class="tag">OPINIONES DE CLIENTES</span>
                <h2 class="section-title">Lo que opinan nuestros clientes ${total ? `— ${promedio}/5 ⭐ (${total})` : ""}</h2>

                <div class="resenas-grid">
                    ${resenas.map(r => `
                        <div class="card resena-card">
                            <span class="resena-estrellas">${estrellas(r.calificacion)}</span>
                            <h3 class="resena-nombre">${r.usuario_nombre}</h3>
                            ${r.comentario ? `<p class="resena-texto">${r.comentario}</p>` : ""}
                            <div class="resena-footer">
                                <span class="resena-avatar">${r.usuario_nombre.charAt(0).toUpperCase()}</span>
                                ${r.compra_verificada ? '<span class="resena-verificada"><i class="fa-solid fa-circle-check"></i> Compra verificada</span>' : ""}
                            </div>
                        </div>
                    `).join("") || `
                        <div class="resenas-vacio">
                            <p>Aún no hay reseñas para este producto.<br>Sé el primero en opinar.</p>
                        </div>
                    `}
                </div>

                ${usuario ? `
                    <div class="resena-form">
                        <p>Tu calificación:</p>
                        <div class="resena-estrellas-input" id="resena-estrellas-input">
                            ${[1,2,3,4,5].map(n => `<i class="fa-solid fa-star" data-valor="${n}"></i>`).join("")}
                        </div>
                        <textarea id="resena-comentario" placeholder="Cuéntanos qué te pareció (opcional)"></textarea>
                        <button class="btn" id="btn-enviar-resena">Publicar reseña</button>
                    </div>
                ` : `<p style="color:var(--text-muted); text-align:center;">Inicia sesión para dejar tu reseña.</p>`}
            </div>
        `;

        if (usuario) {
            let valorSeleccionado = 0;
            const estrellasInput = document.querySelectorAll("#resena-estrellas-input i");
            estrellasInput.forEach(el => el.addEventListener("click", () => {
                valorSeleccionado = Number(el.dataset.valor);
                estrellasInput.forEach(e => e.style.color = Number(e.dataset.valor) <= valorSeleccionado ? "#F59E0B" : "var(--border-soft)");
            }));

            document.getElementById("btn-enviar-resena").addEventListener("click", async () => {
                if (!valorSeleccionado) return notificarToast("Selecciona una calificación", "error");
                const token = obtenerToken();
                const comentario = document.getElementById("resena-comentario").value.trim();
                const resp = await fetch(`/api/resenas/${productoId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ calificacion: valorSeleccionado, comentario })
                });
                if (resp.ok) {
                    notificarToast("¡Gracias por tu reseña!", "exito");
                    cargarResenas(productoId);
                } else {
                    const data = await resp.json().catch(() => ({}));
                    notificarToast(data.error || "No se pudo guardar la reseña", "error");
                }
            });
        }
    } catch (e) { console.error(e); }
}
