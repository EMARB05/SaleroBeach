// Al cargar la web del cliente
const urlParams = new URLSearchParams(window.location.search);
const mesaActual = urlParams.get('mesa') || 'Barra';

// Opcional: Mostrar un mensaje de bienvenida
console.log("Sistema Salero: Detectada Mesa " + mesaActual);
// Puedes poner un alert o un texto en el HTML:
// document.getElementById('info-mesa').innerText = "Mesa: " + mesaActual;


let productos = [];
let carrito = [];



async function obtenerProductos() {
    try {
        // Llamamos a la API que creamos en server.js
        const respuesta = await fetch('/api/productos');
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



function actualizarInterfazCarrito() {
    // Buscamos el badge del nuevo icono SVG
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = carrito.length;
        // Si el carrito está vacío, ocultamos la burbuja roja para que quede más limpio
        badge.style.display = carrito.length > 0 ? 'flex' : 'none';
    }

    // Actualizamos también cualquier otro icono de carrito (como el de la vista detallada)
    const otrosIconos = document.querySelectorAll('.icon-cart');
    otrosIconos.forEach(icono => {
        // Mantenemos el formato anterior para compatibilidad con el HTML viejo si existe
        icono.innerHTML = `🛒 <span>${carrito.length}</span>`;
    });
}
// 2. Corregimos la función de agregar para que coincida con los nuevos IDs

function agregarAlCarrito(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    
    if (producto) {
        carrito.push(producto);
        
        // Actualizamos la burbuja roja
        actualizarInterfazCarrito();
        
        console.log("Añadido al pedido:", producto.nombre);
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
        const producto = productos.find(p => p.id === id);
        if (producto) carrito.push(producto);
    } else {
        const index = carrito.findIndex(p => p.id === id);
        if (index !== -1) {
            carrito.splice(index, 1);
        }
    }
    
    // Sincronizamos el número del icono y refrescamos el modal
    actualizarInterfazCarrito();
    mostrarCarrito(); 
}
// Función para cerrar y volver al menú principal
function cerrarVista() {
    document.getElementById('vista-categoria').classList.remove('activo');
}

async function enviarABarra() {
    if (carrito.length === 0) {
        alert("El carrito está vacío, ¡pide algo rico! 🌮");
        return;
    }

    const totalPedido = carrito.reduce((sum, item) => sum + item.precio, 0);

    const datosPedido = {
        mesa: mesaActual,
        items: carrito.map(p => ({
            nombre: p.nombre,
            precio: p.precio,
            imagen: p.imagen,
            sub: p.sub
        })), 
        total: totalPedido
    };

    try {
        const respuesta = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPedido)
        });

        if (respuesta.ok) {
            alert(`¡Pedido enviado a barra! (Mesa ${mesaActual}) 🍻`);
            
            // LIMPIEZA TRAS ÉXITO
            carrito = [];
            actualizarInterfazCarrito(); // El badge volverá a 0 y se ocultará
            cerrarCarrito();
        } else {
            alert("Hubo un problema al enviar el pedido. Inténtalo de nuevo.");
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        alert("Parece que el servidor no responde.");
    }
}

function filtrarEnDetalle() {
    const texto = document.querySelector('.buscador-detalle').value.toLowerCase();
    const items = document.querySelectorAll('.item-lista-pro');

    items.forEach(item => {
        const nombre = item.querySelector('h3').innerText.toLowerCase();
        item.style.display = nombre.includes(texto) ? 'flex' : 'none';
    });
}

window.onload = () => {
    obtenerProductos();
    actualizarInterfazCarrito(); // Inicializa el badge en 0 (oculto)
};