const PEDIDOS_API_URL = "/api/pedidos";
const CUPONES_API_URL = "/api/cupones";
const BOLD_API_URL = "/api/bold";
const USUARIOS_API_URL = "/api/usuarios";

// Cupón aplicado actualmente (si hay uno válido)
let cuponAplicado = null; // { codigo, porcentaje_descuento }

function renderizarCarrito() {
    const contenedor = document.getElementById("cart-container");
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Tu carrito está vacío.</p>
                <a href="productos.html" class="btn">Ver productos</a>
            </div>
        `;
        return;
    }

    let total = 0;

    const filas = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        return `
            <div class="cart-item">
                <img src="${item.imagen}" alt="${item.nombre}">
                <div class="cart-item-info">
                    <h3>${item.nombre}</h3>
                    <p>$${item.precio.toLocaleString()}</p>
                </div>
                <div class="cart-item-qty">
                    <button onclick="cambiarCantidad(${item.id}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
                </div>
                <p class="cart-item-subtotal">$${subtotal.toLocaleString()}</p>
                <button class="cart-item-remove" onclick="eliminarDelCarrito(${item.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join("");

    const totalConDescuento = cuponAplicado
        ? total - (total * (cuponAplicado.porcentaje_descuento / 100))
        : total;

    contenedor.innerHTML = `
        <div class="cart-list">${filas}</div>

        <div class="cart-cupon">
            <label for="cupon-input">¿Tienes un cupón de descuento?</label>
            <div class="cart-cupon-row">
                <input type="text" id="cupon-input" placeholder="Ej: VERANO20" value="${cuponAplicado ? cuponAplicado.codigo : ""}">
                <button type="button" class="btn btn-secundario" id="btn-aplicar-cupon">
                    ${cuponAplicado ? "Quitar" : "Aplicar"}
                </button>
            </div>
            <p class="cart-cupon-msg" id="cupon-msg"></p>
        </div>

        <div class="cart-total">
            ${cuponAplicado ? `
                <div class="cart-total-linea">
                    <span>Subtotal:</span>
                    <span>$${total.toLocaleString()}</span>
                </div>
                <div class="cart-total-linea cart-total-descuento">
                    <span>Descuento (${cuponAplicado.codigo} · ${cuponAplicado.porcentaje_descuento}%):</span>
                    <span>-$${(total - totalConDescuento).toLocaleString()}</span>
                </div>
            ` : ""}
            <div class="cart-total-linea cart-total-final">
                <span>Total:</span>
                <span>$${totalConDescuento.toLocaleString()}</span>
            </div>
        </div>
        <div class="cart-envio">
            <h3>Datos de envío</h3>
            <div class="cart-envio-grid">
                <div class="auth-field">
                    <label for="envio-direccion">Dirección *</label>
                    <input type="text" id="envio-direccion" placeholder="Calle 123 # 45-67, Apto 8B">
                </div>
                <div class="auth-field">
                    <label for="envio-departamento">Departamento *</label>
                    <select id="envio-departamento">
                        <option value="">Selecciona un departamento</option>
                        ${Object.keys(DEPARTAMENTOS_CIUDADES).map(dep => `<option value="${dep}">${dep}</option>`).join("")}
                    </select>
                </div>
                <div class="auth-field">
                    <label for="envio-ciudad">Ciudad *</label>
                    <select id="envio-ciudad" disabled>
                        <option value="">Selecciona primero el departamento</option>
                    </select>
                </div>
                <div class="auth-field">
                    <label for="envio-telefono">Teléfono de contacto *</label>
                    <input type="tel" id="envio-telefono" placeholder="3001234567">
                </div>
                <div class="auth-field">
                    <label for="envio-documento">Cédula / documento *</label>
                    <input type="text" id="envio-documento" placeholder="1002003004">
                </div>
                <div class="auth-field">
                    <label for="envio-notas">Notas de entrega (opcional)</label>
                    <input type="text" id="envio-notas" placeholder="Ej: apto 302, dejar con portería">
                </div>
            </div>
        </div>

        <div class="cart-checkout-msg" id="checkout-msg"></div>

        <div class="cart-pago-opciones">
            <button class="btn-pago btn-pago-contraentrega" id="btn-contraentrega">
                <span class="btn-pago-icon">💵</span>
                Pago contraentrega · $${totalConDescuento.toLocaleString()}
            </button>

            <button class="btn-pago btn-pago-online" id="btn-checkout">
                <span class="btn-pago-icon">💳</span>
                Pagar ahora en línea · $${totalConDescuento.toLocaleString()}
                <span class="btn-pago-sub">Con tarjeta o PSE · 100% seguro</span>
            </button>

            <div class="cart-metodos-icons">
                <div class="metodo-pago-card">
                    <i class="fa-brands fa-cc-visa"></i>
                </div>
                <div class="metodo-pago-card metodo-mastercard">
                    <span class="mc-circles">
                        <span class="mc-circle mc-red"></span>
                        <span class="mc-circle mc-yellow"></span>
                    </span>
                </div>
                <div class="metodo-pago-card metodo-amex">
                    <i class="fa-brands fa-cc-amex"></i>
                </div>
                <div class="metodo-pago-card">
                    <i class="fa-brands fa-cc-discover"></i>
                </div>
                <div class="metodo-pago-card metodo-pse">PSE</div>
            </div>
        </div>
    `;

    const btnContraentrega = document.getElementById("btn-contraentrega");
    if (btnContraentrega) btnContraentrega.addEventListener("click", () => procesarCheckout("contraentrega"));

    const btnCheckout = document.getElementById("btn-checkout");
    if (btnCheckout) btnCheckout.addEventListener("click", () => procesarCheckout("online"));

    const btnCupon = document.getElementById("btn-aplicar-cupon");
    if (btnCupon) btnCupon.addEventListener("click", manejarCupon);

    const selectDepartamento = document.getElementById("envio-departamento");
    if (selectDepartamento) {
        selectDepartamento.addEventListener("change", () => poblarCiudades(selectDepartamento.value));
    }

    precargarDatosEnvio();
}

// Llena el select de Ciudad según el departamento elegido
function poblarCiudades(departamento, ciudadPreseleccionada = "") {
    const selectCiudad = document.getElementById("envio-ciudad");
    if (!selectCiudad) return;

    const ciudades = DEPARTAMENTOS_CIUDADES[departamento] || [];

    if (ciudades.length === 0) {
        selectCiudad.innerHTML = `<option value="">Selecciona primero el departamento</option>`;
        selectCiudad.disabled = true;
        return;
    }

    selectCiudad.innerHTML = ciudades.map(c => `<option value="${c}">${c}</option>`).join("");
    selectCiudad.disabled = false;

    if (ciudadPreseleccionada && ciudades.includes(ciudadPreseleccionada)) {
        selectCiudad.value = ciudadPreseleccionada;
    }
}

// Busca a qué departamento pertenece una ciudad ya guardada (para precargar el perfil)
function buscarDepartamentoDeCiudad(ciudad) {
    for (const [departamento, ciudades] of Object.entries(DEPARTAMENTOS_CIUDADES)) {
        if (ciudades.includes(ciudad)) return departamento;
    }
    return "";
}

// Trae los datos de envío guardados en el perfil del usuario (si ya inició sesión)
// y los deja prellenados en el formulario, para que no tenga que escribirlos siempre.
async function precargarDatosEnvio() {
    const token = typeof obtenerToken === "function" ? obtenerToken() : null;
    if (!token) return;

    try {
        const respuesta = await fetch(`${USUARIOS_API_URL}/perfil`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!respuesta.ok) return;

        const perfil = await respuesta.json();

        const campoDireccion = document.getElementById("envio-direccion");
        const selectDepartamento = document.getElementById("envio-departamento");
        const campoTelefono = document.getElementById("envio-telefono");
        const campoDocumento = document.getElementById("envio-documento");

        if (campoDireccion && perfil.direccion) campoDireccion.value = perfil.direccion;
        if (campoTelefono && perfil.telefono) campoTelefono.value = perfil.telefono;
        if (campoDocumento && perfil.documento_identidad) campoDocumento.value = perfil.documento_identidad;

        if (perfil.ciudad && selectDepartamento) {
            const departamento = buscarDepartamentoDeCiudad(perfil.ciudad);
            if (departamento) {
                selectDepartamento.value = departamento;
                poblarCiudades(departamento, perfil.ciudad);
            }
        }

    } catch (error) {
        console.error("No se pudieron precargar los datos de envío:", error);
    }
}

// Guarda los datos de envío ingresados como predeterminados en el perfil,
// para que la próxima compra ya vengan prellenados. No bloquea el checkout si falla.
async function guardarDatosEnvioComoPerfil(datos) {
    const token = typeof obtenerToken === "function" ? obtenerToken() : null;
    if (!token) return;

    try {
        await fetch(`${USUARIOS_API_URL}/perfil`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(datos)
        });
    } catch (error) {
        console.error("No se pudo guardar el perfil de envío:", error);
    }
}

// Aplica o quita el cupón que el cliente escribió
async function manejarCupon() {
    const input = document.getElementById("cupon-input");
    const msg = document.getElementById("cupon-msg");

    // Si ya hay uno aplicado, el botón funciona como "quitar"
    if (cuponAplicado) {
        cuponAplicado = null;
        renderizarCarrito();
        return;
    }

    const codigo = input.value.trim();
    if (!codigo) return;

    const token = typeof obtenerToken === "function" ? obtenerToken() : null;
    if (!token) {
        mostrarRequiereLogin();
        return;
    }

    msg.textContent = "Verificando...";
    msg.classList.remove("error");

    try {
        const respuesta = await fetch(`${CUPONES_API_URL}/validar/${encodeURIComponent(codigo)}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            msg.textContent = datos.error || "Cupón inválido.";
            msg.classList.add("error");
            return;
        }

        cuponAplicado = { codigo: datos.codigo, porcentaje_descuento: Number(datos.porcentaje_descuento) };
        renderizarCarrito();

    } catch (error) {
        console.error("Error al validar el cupón:", error);
        msg.textContent = "No se pudo verificar el cupón. ¿Está corriendo el servidor?";
        msg.classList.add("error");
    }
}

// Crea el pedido en la base de datos a partir del carrito actual
// metodoPago: "contraentrega" | "online"
async function procesarCheckout(metodoPago) {
    const msg = document.getElementById("checkout-msg");
    const btnContraentrega = document.getElementById("btn-contraentrega");
    const btnCheckout = document.getElementById("btn-checkout");
    const botonClic = metodoPago === "contraentrega" ? btnContraentrega : btnCheckout;
    const carrito = obtenerCarrito();

    if (carrito.length === 0) return;

    // Hace falta estar logueado para crear un pedido
    const token = typeof obtenerToken === "function" ? obtenerToken() : null;
    if (!token) {
        mostrarRequiereLogin();
        return;
    }

    const items = carrito.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad
    }));

    // Datos de envío del formulario
    const direccion_envio = document.getElementById("envio-direccion")?.value.trim();
    const departamento_envio = document.getElementById("envio-departamento")?.value.trim();
    const ciudad_seleccionada = document.getElementById("envio-ciudad")?.value.trim();
    const ciudad_envio = ciudad_seleccionada && departamento_envio
        ? `${ciudad_seleccionada}, ${departamento_envio}`
        : ciudad_seleccionada;
    const telefono_contacto = document.getElementById("envio-telefono")?.value.trim();
    const documento_identidad = document.getElementById("envio-documento")?.value.trim();
    const notas_entrega = document.getElementById("envio-notas")?.value.trim();

    if (!direccion_envio || !departamento_envio || !ciudad_seleccionada || !telefono_contacto || !documento_identidad) {
        if (msg) {
            msg.textContent = "Completa dirección, departamento, ciudad, teléfono y documento antes de continuar.";
            msg.classList.add("error");
        }
        return;
    }

    const payload = {
        items,
        direccion_envio,
        ciudad_envio,
        telefono_contacto,
        documento_identidad,
        notas_entrega: notas_entrega || undefined,
        metodo_pago: metodoPago
    };
    if (cuponAplicado) payload.cupon_codigo = cuponAplicado.codigo;

    const textoOriginal = botonClic.innerHTML;
    botonClic.disabled = true;
    botonClic.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Procesando...`;
    if (msg) {
        msg.textContent = "";
        msg.classList.remove("error");
    }

    try {
        const respuesta = await fetch(PEDIDOS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            if (msg) {
                msg.textContent = datos.error || "No se pudo crear el pedido.";
                msg.classList.add("error");
            }
            botonClic.disabled = false;
            botonClic.innerHTML = textoOriginal;
            return;
        }

        // Pedido creado: se vacía el carrito local y se muestra la confirmación fija
        localStorage.removeItem("carrito");
        actualizarContadorCarrito();
        cuponAplicado = null;
        guardarDatosEnvioComoPerfil({ direccion: direccion_envio, ciudad: ciudad_envio, telefono: telefono_contacto, documento_identidad });
        mostrarConfirmacionPedido(datos.pedido_id, datos.total, metodoPago);

    } catch (error) {
        console.error("Error al crear el pedido:", error);
        if (msg) {
            msg.textContent = "No se pudo conectar con el servidor. ¿Está corriendo?";
            msg.classList.add("error");
        }
        botonClic.disabled = false;
        botonClic.innerHTML = textoOriginal;
    }
}

// Reemplaza el contenido del carrito por un aviso de que hace falta iniciar sesión
function mostrarRequiereLogin() {
    const contenedor = document.getElementById("cart-container");
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="cart-empty cart-login-aviso">
            <i class="fa-solid fa-lock"></i>
            <h3>Necesitas una cuenta para completar tu compra</h3>
            <p>Tu carrito sigue guardado, no se pierde nada.</p>
            <div class="cart-confirmacion-botones">
                <a href="login.html" class="btn">Iniciar sesión</a>
                <a href="registro.html" class="btn btn-secundario">Crear cuenta</a>
            </div>
        </div>
    `;
}

// Reemplaza el contenido del carrito por una confirmación que se queda en pantalla
function mostrarConfirmacionPedido(pedido_id, total, metodoPago) {
    const contenedor = document.getElementById("cart-container");
    if (!contenedor) return;

    if (metodoPago === "contraentrega") {
        contenedor.innerHTML = `
            <div class="cart-empty cart-confirmacion">
                <i class="fa-solid fa-circle-check"></i>
                <h3>¡Pedido #${pedido_id} creado con éxito!</h3>
                <p>Pagas <strong>$${Number(total).toLocaleString()}</strong> contraentrega, cuando recibas tu pedido.</p>
                <div class="cart-confirmacion-botones">
                    <a href="index.html" class="btn">Seguir comprando</a>
                </div>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = `
        <div class="cart-empty cart-confirmacion">
            <i class="fa-solid fa-circle-check"></i>
            <h3>¡Pedido #${pedido_id} creado con éxito!</h3>
            <p>Total a pagar: <strong>$${Number(total).toLocaleString()}</strong></p>
            <p id="bold-msg"></p>
            <div class="cart-confirmacion-botones">
                <button class="btn" id="btn-continuar-pago">
                    <i class="fa-solid fa-lock"></i> Continuar al pago
                </button>
            </div>
        </div>
    `;

    const btnContinuar = document.getElementById("btn-continuar-pago");
    if (btnContinuar) {
        btnContinuar.addEventListener("click", () => {
            btnContinuar.disabled = true;
            btnContinuar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Conectando...`;
            pagarConBold(pedido_id);
        });
    }
}

// Carga el script de Bold una sola vez (si ya está en la página, no lo repite)
function cargarScriptBold() {
    return new Promise((resolve, reject) => {
        if (window.BoldCheckout) return resolve();

        if (document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]')) {
            window.addEventListener("boldCheckoutLoaded", () => resolve(), { once: true });
            window.addEventListener("boldCheckoutLoadFailed", () => reject(new Error("No se pudo cargar Bold")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.bold.co/library/boldPaymentButton.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar Bold"));
        document.head.appendChild(script);
    });
}

// Pide a nuestro backend los datos firmados y abre la pasarela de Bold
async function pagarConBold(pedido_id) {
    const msg = document.getElementById("bold-msg");
    const btnContinuar = document.getElementById("btn-continuar-pago");
    const token = typeof obtenerToken === "function" ? obtenerToken() : null;

    if (!token) {
        mostrarRequiereLogin();
        return;
    }

    if (msg) {
        msg.textContent = "Conectando con Bold...";
        msg.classList.remove("error");
    }

    try {
        const respuesta = await fetch(`${BOLD_API_URL}/preparar-boton/${pedido_id}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            if (msg) {
                msg.textContent = datos.error || "No se pudo iniciar el pago.";
                msg.classList.add("error");
            }
            if (btnContinuar) {
                btnContinuar.disabled = false;
                btnContinuar.innerHTML = `<i class="fa-solid fa-lock"></i> Continuar al pago`;
            }
            return;
        }

        await cargarScriptBold();

        const configCheckout = {
            orderId: datos.orderId,
            currency: datos.currency,
            amount: datos.amount,
            apiKey: datos.apiKey,
            integritySignature: datos.integritySignature,
            description: datos.description
        };
        if (datos.redirectionUrl) configCheckout.redirectionUrl = datos.redirectionUrl;

        const checkout = new window.BoldCheckout(configCheckout);

        checkout.open();

        if (msg) msg.textContent = "";
        if (btnContinuar) {
            btnContinuar.disabled = false;
            btnContinuar.innerHTML = `<i class="fa-solid fa-lock"></i> Continuar al pago`;
        }

    } catch (error) {
        console.error("Error al conectar con Bold:", error);
        if (msg) {
            msg.textContent = "No se pudo conectar con el servidor.";
            msg.classList.add("error");
        }
        if (btnContinuar) {
            btnContinuar.disabled = false;
            btnContinuar.innerHTML = `<i class="fa-solid fa-lock"></i> Continuar al pago`;
        }
    }
}

document.addEventListener("DOMContentLoaded", renderizarCarrito);