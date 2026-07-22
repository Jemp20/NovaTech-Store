const grid = document.querySelector(".product-grid");
let todosLosProductos = [];

function renderizarProductos(lista) {
    grid.innerHTML = "";

    if (lista.length === 0) {
        const mensaje = grid.dataset.destacados === "true"
            ? "Aún no has marcado productos como destacados. Hazlo desde el panel de administración."
            : "No se encontraron productos.";
        grid.innerHTML = `<p style="text-align:center;color:#6b7280;grid-column:1/-1;">${mensaje}</p>`;
        return;
    }

    lista.forEach(producto => {
        const stock = Number(producto.stock);
        let badgeStock = "";
        if (stock === 0) {
            badgeStock = `<span class="badge-stock agotado">Agotado</span>`;
        } else if (stock <= 5) {
            badgeStock = `<span class="badge-stock bajo">¡Solo quedan ${stock}!</span>`;
        }

        grid.innerHTML += `
            <div class="card">
                <a href="producto.html?id=${producto.id}" class="card-link-imagen">
                    ${badgeStock}
                    <button class="btn-favorito" data-producto-id="${producto.id}" title="Agregar a favoritos">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                </a>
                <a href="producto.html?id=${producto.id}" class="card-link-nombre">
                    <h3>${producto.nombre}</h3>
                </a>
                <p>$${Number(producto.precio).toLocaleString()}</p>
                ${stock === 0
                    ? `<button disabled class="btn-agotado">Agotado</button>`
                    : `<button onclick="agregarAlCarrito(${producto.id}, '${producto.nombre}', ${producto.precio}, '${producto.imagen}')">
                        Agregar al carrito
                    </button>`
                }
            </div>
        `;
    });

    if (typeof pintarBotonesFavoritos === "function") pintarBotonesFavoritos();
}

function aplicarFiltros() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get("categoria");
    const searchInput = document.getElementById("search-input");
    const busqueda = (searchInput?.value || params.get("buscar") || "").toLowerCase().trim();

    let resultado = todosLosProductos;

    // Si la grilla tiene data-destacados="true" (home), solo mostramos
    // los productos marcados como destacados desde el panel de admin.
    if (grid.dataset.destacados === "true") {
        resultado = resultado.filter(p => Number(p.destacado) === 1);
    }

    if (categoria) {
        resultado = resultado.filter(p => p.categoria_nombre === categoria);
    }

    if (busqueda) {
        resultado = resultado.filter(p => p.nombre.toLowerCase().includes(busqueda));
    }

    const orden = document.getElementById("orden-productos")?.value;
    if (orden === "precio-asc") resultado = [...resultado].sort((a,b) => a.precio - b.precio);
    if (orden === "precio-desc") resultado = [...resultado].sort((a,b) => b.precio - a.precio);
    if (orden === "nombre") resultado = [...resultado].sort((a,b) => a.nombre.localeCompare(b.nombre));

    renderizarProductos(resultado);
}

async function cargarProductos() {
    try {
        const respuesta = await fetch("/api/productos");
        todosLosProductos = await respuesta.json();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar productos:", error);
        grid.innerHTML = `<p style="text-align:center;color:#6b7280;">No se pudieron cargar los productos. ¿Está corriendo el servidor?</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const params = new URLSearchParams(window.location.search);
    const buscar = params.get("buscar");

    if (searchInput && buscar) {
        searchInput.value = buscar;
    }

    // La búsqueda "en vivo" mientras se escribe solo tiene sentido en la página
    // de catálogo completo. En el inicio (con la grilla de destacados), Enter
    // ya redirige a productos.html vía navbar.js con la búsqueda completa.
    if (searchInput && grid.dataset.destacados !== "true") {
        searchInput.addEventListener("input", aplicarFiltros);
    }
});

cargarProductos();