async function iniciarFavoritos() {
    const usuario = typeof obtenerUsuario === "function" ? obtenerUsuario() : null;
    const denegado = document.getElementById("fav-denegado");
    const contenido = document.getElementById("fav-content");

    if (!usuario) {
        denegado.style.display = "block";
        contenido.style.display = "none";
        return;
    }

    denegado.style.display = "none";
    contenido.style.display = "block";

    cargarFavoritos();
}

async function cargarFavoritos() {
    const contenedor = document.getElementById("favoritos-container");
    const token = obtenerToken();

    try {
        const respuesta = await fetch(`${FAVORITOS_API_URL}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error("No se pudieron cargar los favoritos");

        const favoritos = await respuesta.json();

        if (favoritos.length === 0) {
            contenedor.innerHTML = `
                <p style="text-align:center; color:var(--text-muted); grid-column:1/-1; padding:40px 0;">
                    Aún no has guardado ningún producto como favorito.
                    Busca el ícono de corazón en cualquier producto para agregarlo aquí.
                </p>`;
            return;
        }

        contenedor.innerHTML = favoritos.map(producto => {
            const stock = Number(producto.stock);
            const badgeStock = stock === 0
                ? `<span class="badge-stock agotado">Agotado</span>`
                : stock <= 5
                    ? `<span class="badge-stock bajo">¡Solo quedan ${stock}!</span>`
                    : "";

            return `
                <div class="card">
                    <a href="producto.html?id=${producto.producto_id}" class="card-link-imagen">
                        ${badgeStock}
                        <button class="btn-favorito activo" data-producto-id="${producto.producto_id}" title="Quitar de favoritos">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                        <img src="${producto.imagen}" alt="${producto.nombre}">
                    </a>
                    <a href="producto.html?id=${producto.producto_id}" class="card-link-nombre">
                        <h3>${producto.nombre}</h3>
                    </a>
                    <p>$${Number(producto.precio).toLocaleString()}</p>
                    ${stock === 0
                        ? `<button disabled class="btn-agotado">Agotado</button>`
                        : `<button onclick="agregarAlCarrito(${producto.producto_id}, '${producto.nombre}', ${producto.precio}, '${producto.imagen}')">
                            Agregar al carrito
                        </button>`
                    }
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No se pudieron cargar tus favoritos.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", iniciarFavoritos);
