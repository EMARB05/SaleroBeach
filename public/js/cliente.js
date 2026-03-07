let carrito = [];

// 1. Corregimos la función de cargar menú para que pase el ID como STRING
function cargarMenu() {
    const contenedor = document.getElementById('cat-drinks');
    contenedor.innerHTML = ''; 
    
    productos.forEach(prod => {
        const tarjeta = `
            <div class="product-card">
                <img src="${prod.img}" alt="${prod.nombre}">
                <h3>${prod.nombre}</h3>
                <span class="price">${prod.precio.toFixed(2)}€</span>
                <button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">
                    Add Cart
                </button>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });

    document.querySelector('.icon-cart').onclick = mostrarCarrito;
}

// 2. Corregimos la función de agregar para que coincida con los nuevos IDs
function agregarAlCarrito(idProducto) {
    // Buscamos el producto comparando los IDs como texto
    const producto = productos.find(p => p.id === idProducto);
    
    if (producto) {
        carrito.push(producto);
        
        // Actualizamos el icono del carrito en el HTML
        const iconoCarrito = document.querySelector('.icon-cart');
        iconoCarrito.innerText = `🛒 ${carrito.length}`;
        
        console.log("Añadido correctamente:", producto.nombre);
    } else {
        console.error("No se encontró el producto con ID:", idProducto);
    }
}

function mostrarCarrito() {
    const modal = document.getElementById('modal-carrito');
    const lista = document.getElementById('lista-pedido');
    const totalElem = document.getElementById('precio-total');
    
    modal.style.display = 'block';
    lista.innerHTML = ''; 
    let total = 0;

    const productosAgrupados = {};
    carrito.forEach(item => {
        total += item.precio;
        if (productosAgrupados[item.id]) {
            productosAgrupados[item.id].cantidad++;
        } else {
            productosAgrupados[item.id] = { ...item, cantidad: 1 };
        }
    });

    Object.values(productosAgrupados).forEach(prod => {
        lista.innerHTML += `
            <div class="item-carrito">
                <div class="info-item">
                    <span class="nombre">${prod.nombre}</span>
                    <div class="controles-cantidad">
                        <button onclick="cambiarCantidad('${prod.id}', -1)">-</button>
                        <span class="num-cantidad">${prod.cantidad}</span>
                        <button onclick="cambiarCantidad('${prod.id}', 1)">+</button>
                    </div>
                </div>
                <span class="precio">${(prod.precio * prod.cantidad).toFixed(2)}€</span>
            </div>
        `;
    });

    totalElem.innerText = `Total: ${total.toFixed(2)}€`;
}

// Nueva función para gestionar los botones
function cambiarCantidad(id, cambio) {
    if (cambio === 1) {
        // Buscamos el producto original para añadirlo de nuevo
        const producto = productos.find(p => p.id === id);
        carrito.push(producto);
    } else {
        // Buscamos el índice del primero que coincida para borrar solo uno
        const index = carrito.findIndex(p => p.id === id);
        if (index !== -1) carrito.splice(index, 1);
    }
    
    // Actualizamos el icono de la barra superior
    document.querySelector('.icon-cart').innerText = `🛒 ${carrito.length}`;
    mostrarCarrito(); // Refrescamos el modal para ver el cambio
}
function cerrarCarrito() {
    document.getElementById('modal-carrito').style.display = 'none';
}

window.onload = cargarMenu;