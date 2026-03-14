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
        const respuesta = await fetch('/api/productos/cliente');
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
    // 1. Buscamos todos los contenedores de categorías
    const contenedores = {
        'Food': document.getElementById('cat-food'),
        'Drinks': document.getElementById('cat-drinks'),
        'Salads': document.getElementById('cat-salads'),
        'Desserts': document.getElementById('cat-desserts'),
        'Wines': document.getElementById('cat-wines')
    };

    // 2. Limpiamos todos los contenedores antes de pintar
    Object.values(contenedores).forEach(cont => {
        if (cont) cont.innerHTML = '';
    });

    // 3. Repartimos los productos en su contenedor correspondiente
    productos.forEach(prod => {
        const tarjeta = `
            <div class="product-card">
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <h3>${prod.nombre}</h3>
                <span class="price">${prod.precio.toFixed(2)}€</span>
                <button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">Add Cart</button>
            </div>
        `;

        // Usamos prod.sub para saber en qué contenedor meterlo
        const contenedorDestino = contenedores[prod.sub];
        
        if (contenedorDestino) {
            contenedorDestino.innerHTML += tarjeta;
        }
    });
}


function actualizarInterfazCarrito() {
    const totalItems = carrito.length; 

    // 1. Actualiza el badge de la campana principal (ID cart-count)
    const badgePrincipal = document.getElementById('cart-count');
    if (badgePrincipal) {
        badgePrincipal.innerText = totalItems;
        badgePrincipal.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // 2. Actualiza el número en la vista detallada (ID cart-count-detalle)
    const badgeDetalle = document.getElementById('cart-count-detalle');
    if (badgeDetalle) {
        badgeDetalle.innerText = totalItems;
        // Si quieres que el número de la vista detalle también se oculte al ser 0:
        // badgeDetalle.parentElement.style.opacity = totalItems > 0 ? '1' : '0.5';
    }
}
// 2. Corregimos la función de agregar para que coincida con los nuevos IDs

function agregarAlCarrito(idProducto) {
    const producto = productos.find(p => p.id === idProducto);

    if (producto) {
        carrito.push(producto);
        // Añade esto dentro de tu función de añadir al carrito
        const cartIcon = document.querySelector('.icon-cart-container');
        cartIcon.classList.add('animar-carrito'); // Añadimos la animación

        setTimeout(() => {
            cartIcon.classList.remove('animar-carrito'); // La quitamos tras 200ms
        }, 200);

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
        // Dentro de tu Object.values(productosAgrupados).forEach(prod => { ...
lista.innerHTML += `
    <div class="item-carrito">
        <div class="info-item">
            <span class="nombre">${prod.nombre}</span>
            <input type="text" 
                   class="input-nota" 
                   placeholder="Ej: Poco picante, sin hielo..." 
                   onchange="guardarNota('${prod.id}', this.value)"
                   value="${prod.nota || ''}">
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

function guardarNota(id, texto) {
    // Buscamos todos los productos en el carrito con ese ID y les asignamos la nota
    carrito.forEach(item => {
        if (item.id === id) {
            item.nota = texto;
        }
    });
    console.log("Nota actualizada para " + id + ": " + texto);
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
// --- FUNCIONES PARA LA VISTA DETALLADA ("VER TODO") ---

function verTodo(categoria) {
    const vista = document.getElementById('vista-categoria');
    const lista = document.getElementById('lista-detallada');
    const titulo = document.getElementById('titulo-categoria');

    if (!vista || !lista || !titulo) return;

    // Diccionario de títulos para que sea dinámico
    const nombresTitulos = {
        'Food': 'Food Category',
        'Drinks': 'Drinks',
        'Salads': 'Salads',
        'Desserts': 'Desserts',
        'Wines': 'Wines'
    };

    // Si la categoría no está en el diccionario, pone el nombre tal cual
    titulo.innerText = nombresTitulos[categoria] || categoria;
    
    lista.innerHTML = '';

    // Filtramos los productos que ya descargamos de MongoDB
    // IMPORTANTE: p.sub debe coincidir con 'Salads', 'Desserts', etc. en tu base de datos
    const productosFiltrados = productos.filter(p => p.sub === categoria);

    // Dibujamos los productos en la nueva pantalla
    productosFiltrados.forEach(prod => {
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

    // Activamos la vista (el CSS se encarga de mostrarla)
    vista.classList.add('activo');
}

// Función para cerrar la vista y volver al menú principal
function cerrarVista() {
    const vista = document.getElementById('vista-categoria');
    if (vista) {
        vista.classList.remove('activo');
    }
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
            nota: p.nota || "",
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
            alert(`¡Pedido enviado a barra! (Mesa ${mesaActual})`);

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

// Función para cerrar el modal del carrito
function cerrarCarrito() {
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onload = () => {
    obtenerProductos();
    actualizarInterfazCarrito(); // Inicializa el badge en 0 (oculto)
};