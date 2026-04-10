// --- PROTECCIÓN DE SESIÓN ---
(function comprobarSesion() {
    const usuario = localStorage.getItem('usuarioNombre');
    const rol = localStorage.getItem('usuarioRol');

    // Si no hay usuario O el rol no es 'cocina', lo echamos
    if (!usuario || rol !== 'cocinero') {
        window.location.href = 'login.html';
    }
})();

// Al cargar la página, ponemos el nombre real del usuario
document.addEventListener('DOMContentLoaded', () => {
    const nombreReal = localStorage.getItem('usuarioNombre');
    if (nombreReal) {
        document.getElementById('nombre-chef').innerText = nombreReal;
    }
});

function cerrarSesion() {
    if (confirm("¿Cerrar sesión en Cocina?")) {
        localStorage.removeItem('usuarioNombre');
        window.location.href = 'login.html';
    }
}

let todasLasComandas = [];

// 1. Función para calcular cuánto hace que llegó el pedido
function obtenerDiferenciaTiempo(timestamp) {
    const ahora = new Date();
    const pedidoHora = new Date(timestamp);
    const difMinutos = Math.floor((ahora - pedidoHora) / 60000);
    
    if (difMinutos < 1) return "15:30"; // O la hora fija del pedido
    return `Hace ${difMinutos} min`;
}

// 2. Función principal para pintar las tarjetas (Filtrando comida)
function renderizarPedidosCocina(filtroId = null) {
    const contenedor = document.getElementById('seccion-pedidos');
    const contenedorTabs = document.querySelector('.order-tabs');
    contenedor.innerHTML = ''; 

    if (contenedorTabs) {
        contenedorTabs.innerHTML = todasLasComandas.map(p => `
            <span class="tab ${filtroId === p.id ? 'active' : ''}" 
                  onclick="filtrarPorPedido('${p.id}')">#${p.id}</span>
        `).join('');
    }

    const pedidosAMostrar = filtroId
        ? todasLasComandas.filter(p => p.id === filtroId)
        : todasLasComandas;

    pedidosAMostrar.forEach(pedido => {
        const soloComida = pedido.articulos.filter(item => (item.sub || '').toLowerCase() === 'food');
        if (soloComida.length === 0) return;

        const tieneNotas = soloComida.some(item => item.nota && item.nota.trim() !== "");

        const tarjeta = `
            <article class="order-card" data-order-id="${pedido.id}">
                <div class="card-header">
                    <h2 class="table-id">Mesa ${pedido.mesa}</h2>
                    ${tieneNotas ? '<div class="alert-icon">!</div>' : ''}
                </div>
                
                <div class="product-list">
                    ${soloComida.map(item => {
                        //Aseguramos que la llave use el _id único
                        const llave = `check-${pedido.mongoId}-${item._id}`; 
                        const estaHecho = localStorage.getItem(llave) === 'true';

                        return `
                        <div class="product-item no-img ${estaHecho ? 'visual-done' : ''}">
                            <div class="details">
                                <h3 style="${estaHecho ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                                    ${item.nombre}
                                </h3>
                                ${item.nota ? `<p class="note">⚠️ ${item.nota.toUpperCase()}</p>` : ''}
                            </div>
                            <span class="qty">x${item.cantidad || 1}</span>
                            
                            <button class="btn-check-visual" 
                                    onclick="marcarVisual(this, '${pedido.mongoId}', '${item._id}')">
                                ${estaHecho ? '✅' : '⬜'}
                            </button>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div class="total-items">
                    <hr class="separator">
                    <div class="info-footer">
                        <p class="qty-total">Comida pendiente</p>
                        <p>${obtenerDiferenciaTiempo(pedido.fecha)}</p>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-check" onclick="completarPedido('${pedido.id}')">LISTO</button>
                        <button class="btn-cancel" onclick="cancelarPedido('${pedido.id}')">✖</button>
                    </div>
                </div>
            </article>
        `;
        contenedor.innerHTML += tarjeta;
    });
}
function mostrarSeccion(nombreSeccion) {
    const pedidos = document.getElementById('seccion-pedidos');
    const historial = document.getElementById('seccion-historial');
    const botones = document.querySelectorAll('.sidebar nav ul li');

    if (nombreSeccion === 'pedidos') {
        pedidos.style.display = 'flex';
        historial.style.display = 'none';
        obtenerPedidosCocina(); // Refrescamos pedidos al volver
    } else {
        pedidos.style.display = 'none';
        historial.style.display = 'block';
        cargarHistorialCocina();
    }

    //brillo de los botones
    botones.forEach(boton => {
        boton.classList.remove('active');
        const texto = boton.innerText.toUpperCase();
        if (nombreSeccion === 'pedidos' && texto.includes('COCINA')) boton.classList.add('active');
        else if (nombreSeccion === 'historial' && texto.includes('HISTORY')) boton.classList.add('active');
    });
}
async function completarPedido(idCorto) {
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    // Limpieza de localStorage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`check-${pedido.mongoId}`)) {
            localStorage.removeItem(key);
        }
    });

    try {
        // Usamos la ruta /estado
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Listo' }) 
        });

        if (respuesta.ok) {
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);
            if (tarjeta) {
                tarjeta.classList.add('order-finished');
                const btnCont = tarjeta.querySelector('.card-buttons');
                if (btnCont) {
                    btnCont.innerHTML = `<button class="btn-completed">✔ ENVIADO A BARRA</button>`;
                }

                setTimeout(() => {
                    tarjeta.style.opacity = "0";
                    setTimeout(() => {
                        tarjeta.remove();
                        todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                    }, 300);
                }, 800);
            }
        }
    } catch (error) {
        console.error("Error al completar el pedido:", error);
    }
}
async function obtenerPedidosCocina() {
    try {
        // Traemos TODOS los pedidos activos (Pendientes y Listos)
        const respuesta = await fetch('/api/pedidos/pendientes'); 
        const datos = await respuesta.json();
        
        // FILTROOO,El cocinero solo quiere ver lo que falta por hacer
        const soloParaCocina = datos.filter(p => p.estado === 'Pendiente');

        // Mapeamos solo esos pedidos pendientes
        todasLasComandas = soloParaCocina.map(p => ({
            id: p._id.slice(-3),
            mongoId: p._id,
            mesa: p.mesa || "Barra",
            articulos: p.items,
            fecha: p.fecha,
            estado: p.estado 
        }));
        
        // llamo a la funcion para mostrar las tarjetas en la pantalla.
        renderizarPedidosCocina();

    } catch (error) {
        console.error("Error conectando con la DB:", error);
    }
}

async function cancelarPedido(idCorto) {
    if (!confirm("¿Seguro que quieres cancelar este pedido de comida?")) return;

    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Cancelado' }) 
        });

        if (respuesta.ok) {
            // Refrescamos inmediatamente para que desaparezca
            obtenerPedidosCocina();
            console.log(`Pedido ${idCorto} cancelado. Aparecerá en rojo en Barra.`);
        } else {
            alert("No se pudo cancelar el pedido en el servidor.");
        }
    } catch (error) {
        console.error("Error al cancelar desde cocina:", error);
    }
}

function filtrarPorPedido(id) {
    // Buscamos si hay alguna pestaña activa con ese ID
    const pestañaActiva = document.querySelector(`.tab.active`);
    if (pestañaActiva && pestañaActiva.innerText.includes(id)) {
        // Si ya estaba activo, mostramos todos
        renderizarPedidosCocina();
    } else {
        // Si no, filtramos por ese ID
        renderizarPedidosCocina(id);
    }
}

async function cargarHistorialCocina() {
    try {
        const respuesta = await fetch('/api/pedidos/historial');
        const historial = await respuesta.json();
        const tbody = document.getElementById('history-body-cocina');
        
        if (!tbody) return;

        tbody.innerHTML = historial.map(pedido => {
            // Agrupamos
            const agrupados = pedido.items.reduce((acc, item) => {
                const existe = acc.find(a => a.nombre === item.nombre);
                if (existe) existe.cantidad += 1;
                else acc.push({ ...item, cantidad: 1 });
                return acc;
            }, []);

            const textoMenu = agrupados.map(prod => `${prod.nombre} (x${prod.cantidad})`).join(', ');
            const fecha = new Date(pedido.fecha).toLocaleString();
            const esCancelado = pedido.estado === 'Cancelado';

            return `
                <tr>
                    <td>Mesa ${pedido.mesa || 'N/A'}</td>
                    <td>#${pedido._id.slice(-5)}</td>
                    <td>${textoMenu}</td>
                    <td>${fecha}</td>
                    <td>
                        <span class="status-badge ${esCancelado ? 'canceled' : 'completed'}">
                            ${pedido.estado.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Error al cargar historial en cocina:", error);
    }
}

// El tercer parámetro ahora es itemId (el _id único de Mongo para ese plato)
function marcarVisual(boton, mongoPedidoId, itemId) {
    // Usamos el ID del pedido Y el ID único del ítem para que no haya colisiones
    const llave = `check-${mongoPedidoId}-${itemId}`;
    const estaMarcadoActualmente = localStorage.getItem(llave) === 'true';

    // Cambiamos el estado en el Local Storage
    if (estaMarcadoActualmente) {
        localStorage.removeItem(llave);
    } else {
        localStorage.setItem(llave, 'true');
    }

    if (typeof renderizarPedidosCocina === 'function') {
        renderizarPedidosCocina();
    } else if (typeof renderizarPedidos === 'function') {
        renderizarPedidos();
    }
}

window.onload = obtenerPedidosCocina;
setInterval(obtenerPedidosCocina,5000);