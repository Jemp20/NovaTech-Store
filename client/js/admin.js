const API_BASE = "/api";

let categoriasCache = [];

// ---------- Control de acceso ----------

function iniciarPanel() {
    const usuario = obtenerUsuario();
    const denegado = document.getElementById("admin-denegado");
    const contenido = document.getElementById("admin-content");

    if (!usuario || usuario.rol !== "admin") {
        denegado.style.display = "block";
        contenido.style.display = "none";
        return;
    }

    denegado.style.display = "none";
    contenido.style.display = "block";

    cargarCategorias().then(() => {
        cargarProductosAdmin();
    });
    cargarCategoriasAdmin();
}

// ---------- Tabs ----------

const cargadoresPorTab = {
    pedidos: cargarPedidosAdmin,
    pagos: cargarPagosAdmin,
    clientes: cargarClientesAdmin,
    estadisticas: cargarEstadisticas,
    cupones: cargarCuponesAdmin,
    resenas: cargarResenasAdmin
};

document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");

        const nombreTab = tab.dataset.tab;
        // Siempre volvemos a pedir los datos frescos al hacer clic, para que nunca queden desactualizados
        if (cargadoresPorTab[nombreTab]) {
            cargadoresPorTab[nombreTab]();
        }
    });
});

// ---------- Helpers de fetch autenticado ----------

async function fetchAutenticado(url, opciones = {}) {
    const token = obtenerToken();

    const respuesta = await fetch(url, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(datos.error || "Ocurrió un error inesperado");
    }

    return datos;
}

// ---------- Productos ----------

async function cargarProductosAdmin() {
    const tbody = document.getElementById("tabla-productos");

    try {
        const respuesta = await fetch(`${API_BASE}/productos`);
        const productos = await respuesta.json();

        if (productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Todavía no hay productos.</td></tr>`;
            return;
        }

        tbody.innerHTML = productos.map(p => `
            <tr>
                <td><img src="${p.imagen}" alt="${p.nombre}"></td>
                <td>${p.nombre}${p.destacado ? ' <i class="fa-solid fa-star" style="color:#f59e0b" title="Destacado"></i>' : ''}</td>
                <td>${p.categoria_nombre || "—"}</td>
                <td>$${Number(p.precio).toLocaleString()}</td>
                <td>${p.stock}</td>
                <td>
                    <div class="admin-actions">
                        <button class="admin-btn-icon" onclick="editarProducto(${p.id})" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="admin-btn-icon danger" onclick="eliminarProducto(${p.id})" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar productos:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No se pudieron cargar los productos. ¿Está corriendo el servidor?</td></tr>`;
    }
}

async function cargarCategorias() {
    try {
        const respuesta = await fetch(`${API_BASE}/categorias`);
        categoriasCache = await respuesta.json();

        const select = document.getElementById("producto-categoria");
        select.innerHTML = categoriasCache.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// ---------- Especificaciones técnicas dinámicas ----------

function crearFilaEspecificacion(nombre = "", valor = "") {
    const fila = document.createElement("div");
    fila.className = "admin-spec-fila";
    fila.innerHTML = `
        <input type="text" class="spec-nombre" placeholder="Ej: RAM" value="${nombre}">
        <input type="text" class="spec-valor" placeholder="Ej: 8GB" value="${valor}">
        <button type="button" class="admin-btn-quitar-spec" title="Quitar">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    fila.querySelector(".admin-btn-quitar-spec").addEventListener("click", () => fila.remove());
    return fila;
}

function cargarEspecificacionesEnFormulario(especificaciones) {
    const contenedor = document.getElementById("lista-especificaciones");
    contenedor.innerHTML = "";

    let datos = especificaciones;
    if (typeof datos === "string") {
        try { datos = JSON.parse(datos); } catch { datos = {}; }
    }

    const entradas = Object.entries(datos || {});

    if (entradas.length === 0) {
        contenedor.appendChild(crearFilaEspecificacion());
        return;
    }

    entradas.forEach(([nombre, valor]) => {
        contenedor.appendChild(crearFilaEspecificacion(nombre, valor));
    });
}

function leerEspecificacionesDelFormulario() {
    const filas = document.querySelectorAll("#lista-especificaciones .admin-spec-fila");
    const resultado = {};

    filas.forEach(fila => {
        const nombre = fila.querySelector(".spec-nombre").value.trim();
        const valor = fila.querySelector(".spec-valor").value.trim();
        if (nombre && valor) resultado[nombre] = valor;
    });

    return resultado;
}

document.getElementById("btn-agregar-spec")?.addEventListener("click", () => {
    document.getElementById("lista-especificaciones").appendChild(crearFilaEspecificacion());
});

function abrirModalProducto(producto = null) {
    const modal = document.getElementById("modal-producto");
    const titulo = document.getElementById("modal-producto-titulo");
    const msg = document.getElementById("modal-producto-msg");
    const preview = document.getElementById("producto-imagen-preview");
    const fileInput = document.getElementById("producto-imagen-file");

    msg.className = "admin-msg";
    msg.textContent = "";
    fileInput.value = "";

    document.getElementById("producto-id").value = producto?.id || "";
    document.getElementById("producto-nombre").value = producto?.nombre || "";
    document.getElementById("producto-descripcion").value = producto?.descripcion || "";
    document.getElementById("producto-precio").value = producto?.precio || "";
    document.getElementById("producto-stock").value = producto?.stock ?? 0;
    document.getElementById("producto-imagen").value = producto?.imagen || "";
    document.getElementById("producto-destacado").checked = !!(producto?.destacado);

    cargarEspecificacionesEnFormulario(producto?.especificaciones);

    if (producto?.imagen) {
        preview.src = producto.imagen;
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }

    if (producto?.categoria_id) {
        document.getElementById("producto-categoria").value = producto.categoria_id;
    }

    titulo.textContent = producto ? "Editar producto" : "Nuevo producto";
    modal.classList.add("active");
}

// Vista previa instantánea al elegir un archivo
document.getElementById("producto-imagen-file")?.addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    const preview = document.getElementById("producto-imagen-preview");

    if (archivo) {
        preview.src = URL.createObjectURL(archivo);
        preview.style.display = "block";
    }
});

function cerrarModalProducto() {
    document.getElementById("modal-producto").classList.remove("active");
}

async function editarProducto(id) {
    try {
        const respuesta = await fetch(`${API_BASE}/productos/${id}`);
        const producto = await respuesta.json();
        abrirModalProducto(producto);
    } catch (error) {
        notificarToast("No se pudo cargar el producto para editar.", "error");
    }
}

async function eliminarProducto(id) {
    if (!(await notificarConfirmar("¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer."))) return;

    try {
        await fetchAutenticado(`${API_BASE}/productos/${id}`, { method: "DELETE" });
        cargarProductosAdmin();
    } catch (error) {
        notificarToast(error.message, "error");
    }
}

document.getElementById("btn-nuevo-producto")?.addEventListener("click", () => abrirModalProducto());
document.getElementById("cancelar-producto")?.addEventListener("click", cerrarModalProducto);

document.getElementById("form-producto")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = document.getElementById("modal-producto-msg");
    const boton = e.target.querySelector("button[type='submit']");
    msg.className = "admin-msg";

    const id = document.getElementById("producto-id").value;
    const archivoImagen = document.getElementById("producto-imagen-file").files[0];
    let rutaImagen = document.getElementById("producto-imagen").value;

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {
        // Si el usuario eligió una imagen nueva, la subimos primero
        if (archivoImagen) {
            const formData = new FormData();
            formData.append("imagen", archivoImagen);

            const token = obtenerToken();
            const respuestaUpload = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            const datosUpload = await respuestaUpload.json();

            if (!respuestaUpload.ok) {
                throw new Error(datosUpload.error || "No se pudo subir la imagen");
            }

            rutaImagen = datosUpload.url;
        }

        if (!rutaImagen) {
            throw new Error("Selecciona una imagen para el producto");
        }

        const payload = {
            nombre: document.getElementById("producto-nombre").value.trim(),
            descripcion: document.getElementById("producto-descripcion").value.trim(),
            precio: Number(document.getElementById("producto-precio").value),
            stock: Number(document.getElementById("producto-stock").value),
            imagen: rutaImagen,
            categoria_id: Number(document.getElementById("producto-categoria").value),
            destacado: document.getElementById("producto-destacado").checked ? 1 : 0,
            especificaciones: leerEspecificacionesDelFormulario()
        };

        if (id) {
            await fetchAutenticado(`${API_BASE}/productos/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await fetchAutenticado(`${API_BASE}/productos`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        cerrarModalProducto();
        cargarProductosAdmin();

    } catch (error) {
        msg.classList.add("error");
        msg.textContent = error.message;
    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar";
    }
});

// ---------- Categorías ----------

async function cargarCategoriasAdmin() {
    const tbody = document.getElementById("tabla-categorias");

    try {
        const respuesta = await fetch(`${API_BASE}/categorias`);
        const categorias = await respuesta.json();

        if (categorias.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">Todavía no hay categorías.</td></tr>`;
            return;
        }

        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.slug}</td>
                <td>
                    <div class="admin-actions">
                        <button class="admin-btn-icon" onclick="editarCategoria(${c.id})" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="admin-btn-icon danger" onclick="eliminarCategoria(${c.id})" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar categorías:", error);
        tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No se pudieron cargar las categorías.</td></tr>`;
    }
}

function abrirModalCategoria(categoria = null) {
    const modal = document.getElementById("modal-categoria");
    const titulo = document.getElementById("modal-categoria-titulo");
    const msg = document.getElementById("modal-categoria-msg");

    msg.className = "admin-msg";
    msg.textContent = "";

    document.getElementById("categoria-id").value = categoria?.id || "";
    document.getElementById("categoria-nombre").value = categoria?.nombre || "";
    document.getElementById("categoria-slug").value = categoria?.slug || "";

    titulo.textContent = categoria ? "Editar categoría" : "Nueva categoría";
    modal.classList.add("active");
}

function cerrarModalCategoria() {
    document.getElementById("modal-categoria").classList.remove("active");
}

function editarCategoria(id) {
    const categoria = categoriasCache.find(c => c.id === id);
    if (categoria) abrirModalCategoria(categoria);
}

async function eliminarCategoria(id) {
    if (!(await notificarConfirmar("¿Seguro que quieres eliminar esta categoría?"))) return;

    try {
        await fetchAutenticado(`${API_BASE}/categorias/${id}`, { method: "DELETE" });
        cargarCategoriasAdmin();
        cargarCategorias();
    } catch (error) {
        notificarToast(error.message, "error");
    }
}

document.getElementById("btn-nueva-categoria")?.addEventListener("click", () => abrirModalCategoria());
document.getElementById("cancelar-categoria")?.addEventListener("click", cerrarModalCategoria);

document.getElementById("form-categoria")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = document.getElementById("modal-categoria-msg");
    msg.className = "admin-msg";

    const id = document.getElementById("categoria-id").value;
    const payload = {
        nombre: document.getElementById("categoria-nombre").value.trim(),
        slug: document.getElementById("categoria-slug").value.trim()
    };

    try {
        if (id) {
            await fetchAutenticado(`${API_BASE}/categorias/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await fetchAutenticado(`${API_BASE}/categorias`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        cerrarModalCategoria();
        cargarCategoriasAdmin();
        cargarCategorias();

    } catch (error) {
        msg.classList.add("error");
        msg.textContent = error.message;
    }
});

// ---------- Pedidos ----------

const ESTADOS_PEDIDO = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];

// Convierte un número de teléfono colombiano en un link de WhatsApp válido
function formatearLinkWhatsApp(telefono) {
    if (!telefono) return null;

    const soloDigitos = telefono.replace(/\D/g, "");
    // Si ya trae el 57 de Colombia adelante (12 dígitos) lo dejamos, si no, se lo agregamos
    const numeroConIndicativo = soloDigitos.length === 10 ? `57${soloDigitos}` : soloDigitos;

    return `https://wa.me/${numeroConIndicativo}`;
}

async function cargarPedidosAdmin() {
    const tbody = document.getElementById("tabla-pedidos");

    try {
        const pedidos = await fetchAutenticado(`${API_BASE}/pedidos`);

        if (pedidos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">Todavía no hay pedidos.</td></tr>`;
            return;
        }

        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.usuario_nombre}<br><small>${p.usuario_email}</small></td>
                <td>$${Number(p.total).toLocaleString()}</td>
                <td>
                    <span class="admin-badge-pago ${p.metodo_pago === 'contraentrega' ? 'contraentrega' : 'online'}">
                        <i class="fa-solid ${p.metodo_pago === 'contraentrega' ? 'fa-money-bill-wave' : 'fa-credit-card'}"></i>
                        ${p.metodo_pago === 'contraentrega' ? 'Contraentrega' : 'En línea'}
                    </span>
                </td>
                <td>
                    <select class="admin-select-estado" onchange="cambiarEstadoPedido(${p.id}, this.value)">
                        ${ESTADOS_PEDIDO.map(e => `<option value="${e}" ${e === p.estado ? "selected" : ""}>${e}</option>`).join("")}
                    </select>
                </td>
                <td>${new Date(p.creado_en).toLocaleDateString()}</td>
                <td>
                    <div class="admin-actions">
                        ${formatearLinkWhatsApp(p.telefono_contacto) ? `
                            <a class="admin-btn-icon whatsapp" href="${formatearLinkWhatsApp(p.telefono_contacto)}" target="_blank" title="Escribir por WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i>
                            </a>
                        ` : ""}
                        <button class="admin-btn-icon" onclick="verDetallePedido(${p.id})" title="Ver detalle">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="admin-btn-icon danger" onclick="eliminarPedido(${p.id})" title="Eliminar pedido">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">No se pudieron cargar los pedidos.</td></tr>`;
    }
}

async function cambiarEstadoPedido(id, estado) {
    try {
        await fetchAutenticado(`${API_BASE}/pedidos/${id}/estado`, {
            method: "PUT",
            body: JSON.stringify({ estado })
        });
    } catch (error) {
        notificarToast(error.message, "error");
        cargarPedidosAdmin();
    }
}

async function eliminarPedido(id) {
    if (!(await notificarConfirmar("¿Seguro que quieres eliminar este pedido? Esta acción no se puede deshacer."))) return;

    try {
        await fetchAutenticado(`${API_BASE}/pedidos/${id}`, { method: "DELETE" });
        notificarToast("Pedido eliminado", "exito");
        cargarPedidosAdmin();
    } catch (error) {
        notificarToast(error.message, "error");
    }
}

async function verDetallePedido(id) {
    try {
        const pedido = await fetchAutenticado(`${API_BASE}/pedidos/${id}`);
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
                <div class="modal-fila"><span>Cliente</span><strong>${pedido.usuario_nombre}</strong></div>
                <div class="modal-fila"><span>Email</span><strong>${pedido.usuario_email}</strong></div>
                <div class="modal-fila"><span>Estado</span><strong>${pedido.estado}</strong></div>
                <div class="modal-fila"><span>Total</span><strong>$${Number(pedido.total).toLocaleString()}</strong></div>

                <div class="modal-productos-titulo">Datos de envío</div>
                <div class="modal-fila"><span>Dirección</span><strong>${pedido.direccion_envio || "—"}</strong></div>
                <div class="modal-fila"><span>Ciudad</span><strong>${pedido.ciudad_envio || "—"}</strong></div>
                <div class="modal-fila"><span>Teléfono</span><strong>${pedido.telefono_contacto ? `<a href="${formatearLinkWhatsApp(pedido.telefono_contacto)}" target="_blank" class="modal-link-whatsapp"><i class="fa-brands fa-whatsapp"></i> ${pedido.telefono_contacto}</a>` : "—"}</strong></div>
                <div class="modal-fila"><span>Documento</span><strong>${pedido.documento_identidad || "—"}</strong></div>
                ${pedido.notas_entrega ? `<div class="modal-fila"><span>Notas</span><strong>${pedido.notas_entrega}</strong></div>` : ""}

                <div class="modal-productos-titulo">Productos</div>
                ${detalleHtml}
            `
        );
    } catch (error) {
        notificarToast(error.message, "error");
    }
}

// ---------- Pagos ----------

const ESTADOS_PAGO = ["pendiente", "aprobado", "rechazado"];

async function cargarPagosAdmin() {
    const tbody = document.getElementById("tabla-pagos");

    try {
        const pagos = await fetchAutenticado(`${API_BASE}/pagos`);

        if (pagos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Todavía no hay pagos.</td></tr>`;
            return;
        }

        tbody.innerHTML = pagos.map(pg => `
            <tr>
                <td>#${pg.pedido_id}</td>
                <td>${pg.usuario_nombre}<br><small>${pg.usuario_email}</small></td>
                <td>$${Number(pg.monto).toLocaleString()}</td>
                <td>${pg.metodo}</td>
                <td>
                    <select class="admin-select-estado" onchange="cambiarEstadoPago(${pg.id}, this.value)">
                        ${ESTADOS_PAGO.map(e => `<option value="${e}" ${e === pg.estado ? "selected" : ""}>${e}</option>`).join("")}
                    </select>
                </td>
                <td>${new Date(pg.creado_en).toLocaleDateString()}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar pagos:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No se pudieron cargar los pagos.</td></tr>`;
    }
}

async function cambiarEstadoPago(id, estado) {
    try {
        await fetchAutenticado(`${API_BASE}/pagos/${id}/estado`, {
            method: "PUT",
            body: JSON.stringify({ estado })
        });
        // Si se aprobó, el pedido pasa a "pagado" en el backend: refrescamos esa tabla también
        cargarPedidosAdmin();
    } catch (error) {
        notificarToast(error.message, "error");
        cargarPagosAdmin();
    }
}

// ---------- Clientes ----------

async function cargarClientesAdmin() {
    const tbody = document.getElementById("tabla-clientes");

    try {
        const clientes = await fetchAutenticado(`${API_BASE}/usuarios`);

        if (clientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Todavía no hay clientes registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = clientes.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.email}</td>
                <td><span class="admin-badge ${c.rol}">${c.rol}</span></td>
                <td>${c.total_pedidos}</td>
                <td>$${Number(c.total_comprado).toLocaleString()}</td>
                <td>${new Date(c.creado_en).toLocaleDateString()}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar clientes:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No se pudieron cargar los clientes.</td></tr>`;
    }
}

// ---------- Estadísticas ----------

async function cargarEstadisticas() {
    const grid = document.getElementById("admin-stats-grid");
    const tbody = document.getElementById("tabla-mas-vendidos");

    try {
        const stats = await fetchAutenticado(`${API_BASE}/estadisticas`);

        grid.innerHTML = `
            <div class="admin-stat-card">
                <span>Ventas totales</span>
                <strong>$${Number(stats.total_ventas).toLocaleString()}</strong>
            </div>
            <div class="admin-stat-card">
                <span>Pedidos totales</span>
                <strong>${stats.total_pedidos}</strong>
            </div>
            <div class="admin-stat-card">
                <span>Pedidos pendientes</span>
                <strong>${stats.pedidos_pendientes}</strong>
            </div>
            <div class="admin-stat-card">
                <span>Clientes registrados</span>
                <strong>${stats.total_clientes}</strong>
            </div>
        `;

        if (stats.mas_vendidos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="admin-empty">Todavía no hay ventas.</td></tr>`;
        } else {
            tbody.innerHTML = stats.mas_vendidos.map(p => `
                <tr>
                    <td>${p.nombre}</td>
                    <td>${p.unidades_vendidas}</td>
                </tr>
            `).join("");
        }

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        grid.innerHTML = `<div class="admin-empty">No se pudieron cargar las estadísticas.</div>`;
    }
}

// ---------- Cupones ----------

let cuponesCache = [];

async function cargarCuponesAdmin() {
    const tbody = document.getElementById("tabla-cupones");

    try {
        const cupones = await fetchAutenticado(`${API_BASE}/cupones`);
        cuponesCache = cupones;

        if (cupones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">Todavía no hay cupones.</td></tr>`;
            return;
        }

        tbody.innerHTML = cupones.map(c => `
            <tr>
                <td>${c.codigo}</td>
                <td>${Number(c.porcentaje_descuento)}%</td>
                <td>${c.fecha_expiracion ? new Date(c.fecha_expiracion).toLocaleDateString() : "Sin fecha"}</td>
                <td>${c.activo ? "Sí" : "No"}</td>
                <td>
                    <div class="admin-actions">
                        <button class="admin-btn-icon" onclick="editarCupon(${c.id})" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="admin-btn-icon danger" onclick="eliminarCupon(${c.id})" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar cupones:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">No se pudieron cargar los cupones.</td></tr>`;
    }
}

function abrirModalCupon(cupon = null) {
    const modal = document.getElementById("modal-cupon");
    const titulo = document.getElementById("modal-cupon-titulo");
    const msg = document.getElementById("modal-cupon-msg");

    msg.className = "admin-msg";
    msg.textContent = "";

    document.getElementById("cupon-id").value = cupon?.id || "";
    document.getElementById("cupon-codigo").value = cupon?.codigo || "";
    document.getElementById("cupon-descuento").value = cupon?.porcentaje_descuento || "";
    document.getElementById("cupon-expiracion").value = cupon?.fecha_expiracion
        ? cupon.fecha_expiracion.slice(0, 10)
        : "";
    document.getElementById("cupon-activo").checked = cupon ? !!cupon.activo : true;

    titulo.textContent = cupon ? "Editar cupón" : "Nuevo cupón";
    modal.classList.add("active");
}

function cerrarModalCupon() {
    document.getElementById("modal-cupon").classList.remove("active");
}

function editarCupon(id) {
    const cupon = cuponesCache.find(c => c.id === id);
    if (cupon) abrirModalCupon(cupon);
}

async function eliminarCupon(id) {
    if (!(await notificarConfirmar("¿Seguro que quieres eliminar este cupón?"))) return;

    try {
        await fetchAutenticado(`${API_BASE}/cupones/${id}`, { method: "DELETE" });
        cargarCuponesAdmin();
    } catch (error) {
        notificarToast(error.message, "error");
    }
}

document.getElementById("btn-nuevo-cupon")?.addEventListener("click", () => abrirModalCupon());
document.getElementById("cancelar-cupon")?.addEventListener("click", cerrarModalCupon);

document.getElementById("form-cupon")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = document.getElementById("modal-cupon-msg");
    msg.className = "admin-msg";

    const id = document.getElementById("cupon-id").value;
    const payload = {
        codigo: document.getElementById("cupon-codigo").value.trim(),
        porcentaje_descuento: Number(document.getElementById("cupon-descuento").value),
        fecha_expiracion: document.getElementById("cupon-expiracion").value || null,
        activo: document.getElementById("cupon-activo").checked
    };

    try {
        if (id) {
            await fetchAutenticado(`${API_BASE}/cupones/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await fetchAutenticado(`${API_BASE}/cupones`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        cerrarModalCupon();
        cargarCuponesAdmin();

    } catch (error) {
        msg.classList.add("error");
        msg.textContent = error.message;
    }
});

document.addEventListener("DOMContentLoaded", iniciarPanel);

// ---------- Reseñas ----------

async function cargarResenasAdmin() {
    const tabla = document.getElementById("tabla-resenas");
    try {
        const resenas = await fetchAutenticado("/api/resenas/admin/listar");

        if (resenas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay reseñas todavía.</td></tr>`;
            return;
        }

        tabla.innerHTML = resenas.map(r => `
            <tr>
                <td>${r.producto_nombre}</td>
                <td>${r.usuario_nombre}</td>
                <td>${"⭐".repeat(r.calificacion)}</td>
                <td>${r.comentario || "-"}</td>
                <td>${r.compra_verificada ? "✅" : "—"}</td>
                <td><button class="admin-btn-icon danger" onclick="eliminarResenaAdmin(${r.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join("");
    } catch (error) {
        console.error(error);
        tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error al cargar las reseñas.</td></tr>`;
    }
}

async function eliminarResenaAdmin(id) {
    if (!confirm("¿Eliminar esta reseña?")) return;
    await fetchAutenticado(`/api/resenas/admin/${id}`, { method: "DELETE" });
    cargarResenasAdmin();
}
