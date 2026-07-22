// Módulo compartido de favoritos. Se incluye en cualquier página que muestre
// tarjetas de producto (inicio, catálogo, detalle) para pintar y manejar el
// corazón de "agregar a favoritos". Depende de auth.js (obtenerToken/obtenerUsuario).

const FAVORITOS_API_URL = "/api/favoritos";
let idsFavoritos = new Set();

// Carga los ids de favoritos del usuario logueado (si hay sesión)
async function cargarIdsFavoritos() {
    const token = obtenerToken();
    if (!token) {
        idsFavoritos = new Set();
        return;
    }

    try {
        const respuesta = await fetch(`${FAVORITOS_API_URL}/ids`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!respuesta.ok) return;
        const ids = await respuesta.json();
        idsFavoritos = new Set(ids);
    } catch (error) {
        console.error("Error al cargar favoritos:", error);
    }
}

// Pinta (o repinta) todos los botones de corazón visibles en la página
// según el estado actual de idsFavoritos
function pintarBotonesFavoritos() {
    document.querySelectorAll(".btn-favorito").forEach(boton => {
        const id = Number(boton.dataset.productoId);
        boton.classList.toggle("activo", idsFavoritos.has(id));
    });
}

// Alterna el favorito de un producto (agregar/quitar) y actualiza el botón
async function alternarFavorito(id, boton) {
    const token = obtenerToken();
    if (!token) {
        if (confirm("Debes iniciar sesión para guardar favoritos. ¿Ir a iniciar sesión?")) {
            window.location.href = "login.html";
        }
        return;
    }

    const yaEsFavorito = idsFavoritos.has(id);
    boton.disabled = true;

    try {
        const respuesta = await fetch(`${FAVORITOS_API_URL}/${id}`, {
            method: yaEsFavorito ? "DELETE" : "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error("No se pudo actualizar el favorito");

        if (yaEsFavorito) {
            idsFavoritos.delete(id);
        } else {
            idsFavoritos.add(id);
        }
        pintarBotonesFavoritos();

        // Si estamos en la página de favoritos, quitar la tarjeta al desmarcar
        if (yaEsFavorito && document.getElementById("favoritos-container")) {
            boton.closest(".card")?.remove();
        }
    } catch (error) {
        console.error(error);
        alert("No se pudo actualizar el favorito. Intenta de nuevo.");
    } finally {
        boton.disabled = false;
    }
}

// Delegación de eventos: funciona con tarjetas que se generan dinámicamente
document.addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-favorito");
    if (!boton) return;
    e.preventDefault();
    alternarFavorito(Number(boton.dataset.productoId), boton);
});

document.addEventListener("DOMContentLoaded", async () => {
    await cargarIdsFavoritos();
    pintarBotonesFavoritos();
});
