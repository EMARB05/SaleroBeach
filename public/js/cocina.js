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
                        // REVISIÓN: Aseguramos que la llave use el _id único
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
        cargarHistorialCocina(); //
    }

    // Lógica del brillo de los botones (el resto igual...)
    botones.forEach(boton => {
        boton.classList.remove('active');
        const texto = boton.innerText.toUpperCase();
        if (nombreSeccion === 'pedidos' && texto.includes('COCINA')) boton.classList.add('active');
        else if (nombreSeccion === 'historial' && texto.includes('HISTORY')) boton.classList.add('active');
    });
}
async function completarPedido(idCorto) {
    // 1. Buscamos el pedido para obtener el mongoId antes de borrar nada
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    // 2. Limpieza de localStorage usando el mongoId para ser precisos
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`check-${pedido.mongoId}`)) {
            localStorage.removeItem(key);
        }
    });

    try {
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/completar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);
            if (tarjeta) {
                tarjeta.classList.add('order-finished');
                const btnCont = tarjeta.querySelector('.card-buttons');
                if (btnCont) {
                    btnCont.innerHTML = `<button class="btn-completed">✔ COMPLETADO</button>`;
                }

                setTimeout(() => {
                    tarjeta.style.opacity = "0";
                    setTimeout(() => {
                        tarjeta.remove();
                        todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                    }, 300);
                }, 1000);
            }
        }
    } catch (error) {
        console.error("Error al completar el pedido:", error);
    }
}
async function obtenerPedidosCocina() {
    try {
        // 1. Traemos TODOS los pedidos activos (Pendientes y Listos)
        const respuesta = await fetch('/api/pedidos/pendientes'); 
        const datos = await respuesta.json();
        
        // 2. FILTRO CLAVE: El cocinero solo quiere ver lo que falta por hacer
        const soloParaCocina = datos.filter(p => p.estado === 'Pendiente');

        // 3. Mapeamos solo esos pedidos pendientes
        todasLasComandas = soloParaCocina.map(p => ({
            id: p._id.slice(-3),
            mongoId: p._id,
            mesa: p.mesa || "Barra",
            articulos: p.items,
            fecha: p.fecha,
            estado: p.estado // Guardamos el estado por si acaso
        }));
        
        // Dibujamos las tarjetas en la pantalla
        renderizarPedidosCocina();

    } catch (error) {
        console.error("Error conectando con la DB:", error);
    }
}
async function cancelarPedido(idCorto) {
    if (!confirm("¿Seguro que quieres cancelar este pedido?")) return;

    // Buscamos el pedido en nuestro array local para sacar el mongoId
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/cancelar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
           
            // Buscamos la tarjeta en el HTML usando el ID corto
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);
            
            if (tarjeta) {
                // Le damos una pequeña animación de salida para que quede pro
                tarjeta.style.transition = "all 0.4s ease";
                tarjeta.style.opacity = "0";
                tarjeta.style.transform = "scale(0.9)";

                setTimeout(() => {
                    // 3. La eliminamos físicamente del HTML
                    tarjeta.remove();
                    
                    // 4. Actualizamos nuestro array local para que la cuenta de "pedidos activos" sea real
                    todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                    
                    console.log(`Pedido ${idCorto} eliminado de la vista.`);
                }, 400);
            }
        } else {
            alert("El servidor no pudo cancelar el pedido.");
        }
    } catch (error) {
        console.error("Error al cancelar:", error);
        alert("Error de conexión al intentar cancelar.");
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
        const tbody = document.getElementById('history-body-cocina'); // <--- Mira que el ID sea correcto en tu HTML
        
        if (!tbody) return;

        tbody.innerHTML = historial.map(pedido => {
            // Agrupamos para que no salgan 20 líneas si pidió 20 croquetas
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

    // Volvemos a pintar para aplicar el cambio visual
    // Asegúrate de que tu vista de cocina usa renderizarPedidosCocina
    if (typeof renderizarPedidosCocina === 'function') {
        renderizarPedidosCocina();
    } else if (typeof renderizarPedidos === 'function') {
        renderizarPedidos();
    }
}

window.onload = obtenerPedidosCocina;
setInterval(obtenerPedidosCocina, 15000);