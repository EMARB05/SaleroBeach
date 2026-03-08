let productos = [];
let carrito = [];



async function obtenerProductos() {
    try {
        // Llamamos a la API que creamos en server.js
        const respuesta = await fetch('http://localhost:3000/api/productos');
        productos = await respuesta.json();
        
        console.log("✅ Datos cargados desde MongoDB:", productos);
        
        // Una vez tenemos los datos, pintamos el menú
        cargarMenu(); 
    } catch (error) {
        console.error("❌ Error al conectar con la API:", error);
    }
}

// 1. Corregimos la función de cargar menú para que pase el ID como STRING
function cargarMenu() {
    const contenedorComida = document.getElementById('cat-food');
    const contenedorBebida = document.getElementById('cat-drinks');
    
    if(!contenedorComida || !contenedorBebida) return;

    contenedorComida.innerHTML = '';
    contenedorBebida.innerHTML = '';

    productos.forEach(prod => {
        // IMPORTANTE: Cambiado prod.img por prod.imagen para que coincida con Compass
        const tarjeta = `
            <div class="product-card">
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <h3>${prod.nombre}</h3>
                <span class="price">${prod.precio.toFixed(2)}€</span>
                <button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">Add Cart</button>
            </div>
        `;

        if(prod.sub === 'Food') {
            contenedorComida.innerHTML += tarjeta;
        } else {
            contenedorBebida.innerHTML += tarjeta;
        }
    });
}

// 2. Corregimos la función de agregar para que coincida con los nuevos IDs

function agregarAlCarrito(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    
    if (producto) {
        carrito.push(producto);
        
        // Buscamos TODOS los iconos de carrito
        const iconos = document.querySelectorAll('.icon-cart');
        
        iconos.forEach(icono => {
            icono.innerHTML = `🛒 <span>${carrito.length}</span>`;
            // IMPORTANTE: Les damos a todos la función de abrir
            icono.onclick = mostrarCarrito; 
        });
        
        console.log("Añadido:", producto.nombre);
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

window.onload = obtenerProductos;

// Función para abrir la pantalla de "Ver Todo"
function verTodo(categoria) {
    const vista = document.getElementById('vista-categoria');
    const lista = document.getElementById('lista-detallada');
    const titulo = document.getElementById('titulo-categoria');

    titulo.innerText = categoria === 'Food' ? 'Food Category' : 'Drinks';
    lista.innerHTML = '';

    // Filtramos los productos que trajimos de la DB
    const productosFiltrados = productos.filter(p => p.sub === categoria);

    productosFiltrados.forEach(prod => {
        // Usamos 'imagen' que es como viene de MongoDB
        lista.innerHTML += `
            <div class="item-lista-pro">
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <div class="info">
                    <h3>${prod.nombre}</h3>
                    <span>${Number(prod.precio).toFixed(2)}€</span>
                </div>
                <button class="btn-add-detalle" onclick="agregarAlCarrito('${prod.id}')">Add Cart</button>
            </div>
        `;
    });

    vista.classList.add('activo');
}

// Función para cerrar y volver al menú principal
function cerrarVista() {
    document.getElementById('vista-categoria').classList.remove('activo');
}

function enviarABarra() {
    if (carrito.length === 0) {
        alert("El carrito está vacío, ¡pide algo rico!");
        return;
    }
    
    alert("¡Pedido enviado a barra! Enseguida te lo servimos 🍻");
    
    // Limpiamos todo
    carrito = [];
    document.querySelector('.icon-cart').innerText = `🛒 0`;
    cerrarCarrito();
}

function filtrarEnDetalle() {
    const texto = document.querySelector('.buscador-detalle').value.toLowerCase();
    const items = document.querySelectorAll('.item-lista-pro');

    items.forEach(item => {
        const nombre = item.querySelector('h3').innerText.toLowerCase();
        item.style.display = nombre.includes(texto) ? 'flex' : 'none';
    });
}
