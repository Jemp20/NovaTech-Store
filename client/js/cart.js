// Obtiene el carrito guardado (o un array vacío si no hay nada)
function obtenerCarrito() {
    const datos = localStorage.getItem("carrito");
    return datos ? JSON.parse(datos) : [];
}

// Guarda el carrito completo
function guardarCarrito(carrito) {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarContadorCarrito();
}

// Agrega un producto (o suma cantidad si ya existe)
function agregarAlCarrito(id, nombre, precio, imagen) {
    const carrito = obtenerCarrito();
    const existente = carrito.find(item => item.id === id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({ id, nombre, precio: Number(precio), imagen, cantidad: 1 });
    }

    guardarCarrito(carrito);
    notificarToast(`${nombre} agregado al carrito`, "exito");
}

// Elimina un producto del carrito
function eliminarDelCarrito(id) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(item => item.id !== id);
    guardarCarrito(carrito);
    if (typeof renderizarCarrito === "function") renderizarCarrito();
}

// Cambia la cantidad de un producto (+1 o -1)
function cambiarCantidad(id, delta) {
    const carrito = obtenerCarrito();
    const item = carrito.find(item => item.id === id);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }

    guardarCarrito(carrito);
    if (typeof renderizarCarrito === "function") renderizarCarrito();
}

// Actualiza el numerito sobre el ícono del carrito en el navbar
function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
    const badge = document.getElementById("cart-badge");
    if (badge) {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? "flex" : "none";
    }
}

// Corre en todas las páginas al cargar
document.addEventListener("DOMContentLoaded", actualizarContadorCarrito);