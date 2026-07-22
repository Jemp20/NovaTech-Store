const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

if (menuToggle && menu) {
    menuToggle.addEventListener("click", () => {
        menu.classList.toggle("active");
    });
}

const searchToggle = document.getElementById("search-toggle");
const searchBox = document.getElementById("search-box");
const searchInput = document.getElementById("search-input");

if (searchToggle && searchBox) {
    searchToggle.addEventListener("click", () => {
        searchBox.classList.toggle("active");
        if (searchBox.classList.contains("active")) searchInput.focus();
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && searchInput.value.trim() !== "") {
            const enProductos = window.location.pathname.endsWith("productos.html");
            if (!enProductos) {
                // Fuera de la página de catálogo completo (ej. inicio u ofertas): redirige
                // a buscar en TODOS los productos, no solo en los que se ven aquí.
                const enOfertas = window.location.pathname.endsWith("ofertas.html");
                const origen = enOfertas ? "&origen=ofertas" : "";
                window.location.href = `productos.html?buscar=${encodeURIComponent(searchInput.value.trim())}${origen}`;
            }
        }
    });
}

// Ícono de usuario (sesión, pedidos, admin, salir)
const userToggle = document.getElementById("user-toggle");
const userDropdown = document.getElementById("user-dropdown");

if (userToggle && userDropdown) {
    userToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("active");
        if (searchBox) searchBox.classList.remove("active");
    });
}

// Cierra los desplegables (usuario y búsqueda) si se hace clic afuera
document.addEventListener("click", (e) => {
    if (userDropdown && userToggle && !userDropdown.contains(e.target) && e.target !== userToggle) {
        userDropdown.classList.remove("active");
    }
    if (searchBox && searchToggle && !searchBox.contains(e.target) && e.target !== searchToggle) {
        searchBox.classList.remove("active");
    }
});

// Botón de tema oscuro/claro. El tema ya se aplicó al <html> apenas cargó la
// página (ver script en el <head>, antes de pintar) para evitar parpadeo;
// aquí solo sincronizamos el ícono y manejamos el clic para cambiarlo.
const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {
    function actualizarIconoTema() {
        const esClaro = document.documentElement.getAttribute("data-theme") === "light";
        themeToggle.classList.toggle("fa-sun", esClaro);
        themeToggle.classList.toggle("fa-moon", !esClaro);
    }

    actualizarIconoTema();

    themeToggle.addEventListener("click", () => {
        const actual = document.documentElement.getAttribute("data-theme") || "dark";
        const nuevo = actual === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nuevo);
        localStorage.setItem("novatech-tema", nuevo);
        actualizarIconoTema();
    });
}