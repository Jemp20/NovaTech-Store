const API_URL = "/api/auth";

// ---------- Utilidades de sesión ----------

function guardarSesion(token, usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

function obtenerUsuario() {
    const datos = localStorage.getItem("usuario");
    return datos ? JSON.parse(datos) : null;
}

function obtenerToken() {
    return localStorage.getItem("token");
}

function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
}

// ---------- Formulario de registro ----------

const formRegistro = document.getElementById("form-registro");

if (formRegistro) {
    formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBox = document.getElementById("auth-error");
        const successBox = document.getElementById("auth-success");
        const boton = formRegistro.querySelector(".auth-submit");

        errorBox.classList.remove("active");
        successBox.classList.remove("active");

        const nombre = document.getElementById("nombre").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!nombre || !email || !password) {
            errorBox.textContent = "Todos los campos son obligatorios.";
            errorBox.classList.add("active");
            return;
        }

        if (password.length < 6) {
            errorBox.textContent = "La contraseña debe tener al menos 6 caracteres.";
            errorBox.classList.add("active");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Creando cuenta...";

        try {
            const respuesta = await fetch(`${API_URL}/registro`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, password })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                errorBox.textContent = datos.error || "No se pudo crear la cuenta.";
                errorBox.classList.add("active");
                return;
            }

            successBox.textContent = "Cuenta creada. Redirigiendo al login...";
            successBox.classList.add("active");
            setTimeout(() => (window.location.href = "login.html"), 1200);

        } catch (error) {
            console.error("Error en registro:", error);
            errorBox.textContent = "No se pudo conectar con el servidor. ¿Está corriendo?";
            errorBox.classList.add("active");
        } finally {
            boton.disabled = false;
            boton.textContent = "Crear cuenta";
        }
    });
}

// ---------- Formulario de login ----------

const formLogin = document.getElementById("form-login");

if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBox = document.getElementById("auth-error");
        const boton = formLogin.querySelector(".auth-submit");

        errorBox.classList.remove("active");

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        boton.disabled = true;
        boton.textContent = "Iniciando sesión...";

        try {
            const respuesta = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                errorBox.textContent = datos.error || "Credenciales inválidas.";
                errorBox.classList.add("active");
                return;
            }

            guardarSesion(datos.token, datos.usuario);
            window.location.href = "index.html";

        } catch (error) {
            console.error("Error en login:", error);
            errorBox.textContent = "No se pudo conectar con el servidor. ¿Está corriendo?";
            errorBox.classList.add("active");
        } finally {
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
        }
    });
}

// ---------- Estado de sesión en el navbar ----------

function pintarEstadoNavbar() {
    const contenedor = document.getElementById("nav-account-slot");
    if (!contenedor) return;

    const usuario = obtenerUsuario();

    if (usuario) {
        const linkAdmin = usuario.rol === "admin"
            ? `<a href="admin.html" class="nav-account">Admin</a>`
            : "";

        contenedor.innerHTML = `
            <div class="user-dropdown-saludo">Hola, ${usuario.nombre.split(" ")[0]}</div>
            <a href="mis-pedidos.html" class="nav-account">Mis pedidos</a>
            <a href="favoritos.html" class="nav-account">Favoritos</a>
            ${linkAdmin}
            <button class="nav-account" id="btn-logout">Salir</button>
        `;
        document.getElementById("btn-logout").addEventListener("click", cerrarSesion);
    } else {
        contenedor.innerHTML = `<a href="login.html" class="nav-account">Iniciar sesión</a>`;
    }
}

document.addEventListener("DOMContentLoaded", pintarEstadoNavbar);
