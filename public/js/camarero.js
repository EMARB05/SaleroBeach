// --- PROTECCIÓN DE SESIÓN ---
(function comprobarSesion() {
    const usuario = localStorage.getItem('usuarioNombre');
    const rol = localStorage.getItem('usuarioRol');
    if (!usuario || rol !== 'camarero') {
        window.location.href = 'login.html';
    }
})();

let pedidosActivos = [];
let mesaSeleccionada = null;
let idPedidoSeleccionado = null;
let todosLosProductos = []; // para el filtro

// 1. Al cargar la página
window.onload = () => {
    actualizarVistaSala();
    setInterval(actualizarVistaSala, 5000);
};

// 2. OBTENER MESAS REALES Y SUS PEDIDOS
async function actualizarVistaSala() {
    try {
        const resMesas = await fetch('/api/mesas');
        let mesasDB = await resMesas.json();
        
        //Para ordenar las mesas
        mesasDB.sort((a, b) => {
            // Extraemos solo los números ya q pueden haber mesas como 1+2
            const numA = parseInt(a.numero);
            const numB = parseInt(b.numero);
            return numA - numB;
        });

        const resPedidos = await fetch('/api/pedidos/pendientes');
        pedidosActivos = await resPedidos.json();

        const terra = document.getElementById('contenedor-terraza');
        const inte = document.getElementById('contenedor-interior');

        if (!terra || !inte) return;

        
        terra.innerHTML = '';
        inte.innerHTML = '';

        mesasDB.forEach(mesa => {
            // Saltamos las mesas desactivadas
            if (!mesa.activa) return;

            // Buscamos pedido
            const pedido = pedidosActivos.find(p => p.mesa === mesa.numero.toString());

            // REPARTO CORREGIDO
            const zona = (mesa.zona || "").toLowerCase();

            if (zona === 'terraza') {
                pintarMesaEnContenedor(mesa, pedido, terra);
            } else if (zona === 'interior') {
                pintarMesaEnContenedor(mesa, pedido, inte);
            } else {
                console.warn(`Mesa ${mesa.numero} tiene una zona desconocida: ${mesa.zona}`);
            }
        });

    } catch (err) {
        console.error("Error al cargar sala dinámica:", err);
    }
}

// CREAR EL BOTÓN DE LA MESA (Adaptado a objeto mesa)
function pintarMesaEnContenedor(mesa, pedido, contenedor) {
    const estaOcupada = !!pedido;
    const div = document.createElement('div');

    // Añadimos la clase 'mesa' y el estado
    div.className = `mesa ${estaOcupada ? 'ocupada' : 'libre'}`;

    div.innerHTML = `
        <div class="mesa-content">
            <span class="mesa-numero">${mesa.numero}</span>
            <span class="mesa-estado">${estaOcupada ? 'OCUPADA' : 'LIBRE'}</span>
        </div>
    `;

    div.onclick = () => abrirDetalleMesa(mesa.numero, pedido);
    contenedor.appendChild(div);
}

// 4. Navegación
function abrirDetalleMesa(numeroMesa, pedido) {
    mesaSeleccionada = numeroMesa;
    idPedidoSeleccionado = pedido ? pedido._id : null;

    document.getElementById('current-table-title').innerText = `Mesa ${numeroMesa}`;
    document.getElementById('screen-tables').style.display = 'none';
    document.getElementById('screen-order-detail').style.display = 'block';

    renderizarContenidoPedido(pedido);
}

function showTables() {
    document.getElementById('screen-tables').style.display = 'block';
    document.getElementById('screen-order-detail').style.display = 'none';
    actualizarVistaSala();
}

function renderizarContenidoPedido(pedido) {
    const container = document.getElementById('order-content');
    
    if (!pedido || !pedido.items || pedido.items.length === 0) {
        container.innerHTML = `<p class="empty-msg">Mesa vacía. Pulsa añadir para empezar.</p>`;
        return;
    }

    
    let bannerAsignacion = "";
    
    // Obtenemos el nombre del que tiene la sesión abierta
    const miNombre = (localStorage.getItem('usuarioNombre') || "").trim();
    // Obtenemos el nombre asignado al pedido
    const asignado = (pedido.camareroAsignado || "Cliente (QR)").trim();
    
    if (asignado === 'Cliente (QR)') {
        bannerAsignacion = `
            <div class="banner-asignacion pendiente">
                <i class="fas fa-bell"></i>
                <span>Pedido QR sin atender</span>
                <button class="btn-tomar-mesa" onclick="atenderPedido('${pedido._id}')">
                    TOMAR MESA
                </button>
            </div>`;
    } else {
        // Comparamos los nombres tal cual vienen de la DB
        const esMiMesa = (asignado.toLowerCase() === miNombre.toLowerCase());
        
        bannerAsignacion = `
            <div class="banner-asignacion ${esMiMesa ? 'propia' : 'ajena'}">
                <i class="fas ${esMiMesa ? 'fa-user-check' : 'fa-user-friends'}"></i>
                <span>${esMiMesa ? 'Atendido por TI' : 'Atendido por: ' + asignado}</span>
            </div>`;
    }

    //el total
    const totalMesa = pedido.items.reduce((acc, item) => acc + (item.precio * (item.cantidad || 1)), 0);

    container.innerHTML = bannerAsignacion + pedido.items.map(item => `
        <div class="product-item">
            <div class="info">
                <strong>${item.nombre}</strong>
                <span>x${item.cantidad || 1}</span>
            </div>
            <div class="price">${((item.precio || 0) * (item.cantidad || 1)).toFixed(2)}€</div>
        </div>
    `).join('') + `
        <div class="total-preview">
            <span>TOTAL ACTUAL:</span>
            <strong>${totalMesa.toFixed(2)}€</strong>
        </div>
    `;
}

// Modal y Filtros
async function abrirModalProductos() {
    const modal = document.getElementById('modal-products');
    modal.style.display = 'block';

    try {
        const res = await fetch('/api/productos');
        todosLosProductos = await res.json();
        filtrarProductos('todos');
    } catch (err) {
        console.error("Error cargando productos");
    }
}

function filtrarProductos(categoria) {
    const lista = document.getElementById('quick-products-list');

    // Actualizar botones
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(categoria.toLowerCase()) ||
            (categoria === 'todos' && btn.innerText === 'Todos')) {
            btn.classList.add('active');
        }
    });

    // Filtrar
    const filtrados = categoria === 'todos'
        ? todosLosProductos
        : todosLosProductos.filter(p => p.sub === categoria);

    // Pintar
    lista.innerHTML = filtrados.map(p => `
        <div class="product-card-mini" onclick="añadirItemMesa('${p.nombre}', ${p.precio}, '${p.sub}', '${p.imagen}')">
            <img src="${p.imagen}" alt="${p.nombre}">
            <div class="mini-info">
                <h4>${p.nombre}</h4>
                <span>${p.precio.toFixed(2)}€</span>
            </div>
        </div>
    `).join('');
}

function cerrarModal() {
    document.getElementById('modal-products').style.display = 'none';
}

// Añadir item a la DB
async function añadirItemMesa(nombre, precio, sub, imagen) {
    // Si la mesa no tiene pedido,creamos uno nuevo
    if (!idPedidoSeleccionado) {
        console.log("Mesa libre detectada. Abriendo pedido...");
        try {
            const resApertura = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mesa: mesaSeleccionada.toString(),
                    items: [],
                    total: 0,
                    estado: 'Pendiente',
                    camareroAsignado: localStorage.getItem('usuarioNombre')
                })
            });

            if (!resApertura.ok) throw new Error("No se pudo crear el pedido en el servidor");

            const dataNuevo = await resApertura.json();
            // Importante: tu servidor devuelve el ID dentro de 'id' o '_id'
            idPedidoSeleccionado = dataNuevo.id || dataNuevo._id;

        } catch (err) {
            return alert("Error abriendo la mesa: " + err.message);
        }
    }

    // 2. AHORA AÑADIMOS EL ARTÍCULO AL PEDIDO (SEA NUEVO O VIEJO)
    const nuevoItem = {
        nombre: nombre,
        precio: parseFloat(precio),
        sub: sub,
        imagen: imagen,
        nota: ""
    };

    try {
        const res = await fetch(`/api/pedidos/${idPedidoSeleccionado}/anadir-item`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoItem)
        });

        if (res.ok) {
            console.log("Añadido:", nombre);

            // Refrescamos los pedidos para que la mesa cambie a ROJO en la sala
            const res2 = await fetch('/api/pedidos/pendientes');
            pedidosActivos = await res2.json();

            const pedidoActualizado = pedidosActivos.find(p => p._id === idPedidoSeleccionado);
            renderizarContenidoPedido(pedidoActualizado);
        } else {
            const errorTexto = await res.text();
            alert("Error al añadir producto: " + errorTexto);
        }
    } catch (err) {
        alert("Error de conexión con el servidor");
    }
}

function toggleSeccion(idContenedor, elementoHeader) {
    const contenido = document.getElementById(idContenedor);
    const flecha = elementoHeader.querySelector('.arrow');

    if (contenido.style.display === "none") {
        contenido.style.display = "grid";
        flecha.style.transform = "rotate(0deg)";
    } else {
        contenido.style.display = "none";
        flecha.style.transform = "rotate(-90deg)";
    }
}

let pedidoParaCobrar = null; // Guardamos el pedido temporalmente

function cobrarMesaActual() {
    // Buscamos el pedido actual entre los activos
    pedidoParaCobrar = pedidosActivos.find(p => p._id === idPedidoSeleccionado);

    if (!pedidoParaCobrar) return alert("No hay productos en esta mesa");

    // Llenamos el modal con los datos
    document.getElementById('factura-mesa').innerText = mesaSeleccionada;
    document.getElementById('factura-total-monto').innerText = pedidoParaCobrar.total.toFixed(2) + "€";

    const container = document.getElementById('factura-items');
    container.innerHTML = pedidoParaCobrar.items.map(item => `
        <div class="ticket-item-row">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span>${(item.precio * item.cantidad).toFixed(2)}€</span>
        </div>
    `).join('');

    // Mostramos el modal
    document.getElementById('modal-factura').style.display = 'block';
}

function cerrarModalFactura() {
    document.getElementById('modal-factura').style.display = 'none';
}

async function confirmarPagoFinal() {
    try {

        const res = await fetch(`/api/pedidos/${pedidoParaCobrar._id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Pagado' })
        });

        if (res.ok) {
            cerrarModalFactura();
            showTables();
            actualizarVistaSala();
        } else {
            alert("Error al procesar el pago");
        }
    } catch (err) {
        alert("Error de conexión");
    }
}

async function atenderPedido(idPedido) {
    // Obtenemos el nombre real del camarero logueado
    const nombre = localStorage.getItem('usuarioNombre');

    if (!nombre) {
        alert("Sesión caducada. Por favor, vuelve a entrar.");
        window.location.href = 'login.html';
        return;
    }

    // Llamada al servidor
    try {
        const res = await fetch(`/api/pedidos/${idPedido}/asignar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreCamarero: nombre })
        });

        if (res.ok) {
            const pedidoActualizado = await res.json();
            console.log("Mesa tomada por:", nombre);
            
            // Actualizamos nuestra lista local y volvemos a pintar
            // Buscamos el índice para reemplazarlo por el nuevo que viene del server
            const index = pedidosActivos.findIndex(p => p._id === idPedido);
            if (index !== -1) pedidosActivos[index] = pedidoActualizado;

            // Refrescamos la pantalla de detalle para que el botón desaparezca
            renderizarContenidoPedido(pedidoActualizado);
        } else {
            alert("No se pudo asignar la mesa. Inténtalo de nuevo.");
        }
    } catch (err) {
        console.error("Error de red:", err);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}