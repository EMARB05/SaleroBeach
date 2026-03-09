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
                        // Revisamos si este plato específico está marcado como hecho en el navegador
                        const llave = `check-${pedido.id}-${item.nombre}`;
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
                                    style="background: none; border: 1px solid #ccc; cursor: pointer; font-size: 1.2rem; margin-left: 10px; border-radius: 4px;"
                                    onclick="marcarVisual(this, '${pedido.id}', '${item.nombre}')">
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
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`check-${idCorto}`)) {
            localStorage.removeItem(key);
        }
    });
    // Buscamos el pedido en nuestro array local para sacar el mongoId
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    
    if (!pedido) {
        console.error("No se encontró el pedido para completar");
        return;
    }

    try {
        // 2. Avisamos al servidor para que cambie el estado a 'Listo'
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/completar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
            // 3. Si el servidor dice OK, hacemos la animación de salida
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);
            if (tarjeta) {
                tarjeta.classList.add('order-finished');
                // Ponemos el botón en naranja de "COMPLETADO"
                const btnCont = tarjeta.querySelector('.card-buttons');
                if (btnCont) {
                    btnCont.innerHTML = `<button class="btn-completed">✔ COMPLETADO</button>`;
                }

                // Esperamos un poco y lo quitamos de la vista
                setTimeout(() => {
                    tarjeta.style.opacity = "0";
                    setTimeout(() => {
                        tarjeta.remove();
                        // Filtramos el array local para que desaparezca del todo
                        todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                    }, 300);
                }, 1000);
            }
        }
    } catch (error) {
        console.error("Error al completar el pedido:", error);
        alert("No se pudo conectar con el servidor para marcar como listo");
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
        
        // 4. Dibujamos las tarjetas en la pantalla
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
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/cancelar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
            // Refrescamos inmediatamente para que desaparezca
            obtenerPedidosCocina();
        }
    } catch (error) {
        console.error("Error al cancelar:", error);
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

function marcarVisual(boton, pedidoId, nombreArticulo) {
    const llave = `check-${pedidoId}-${nombreArticulo}`;
    const estaMarcadoActualmente = localStorage.getItem(llave) === 'true';

    // Cambiamos el estado en el almacenamiento del navegador
    if (estaMarcadoActualmente) {
        localStorage.removeItem(llave);
    } else {
        localStorage.setItem(llave, 'true');
    }

    // Volvemos a pintar la pantalla inmediatamente para que se vea el cambio
    renderizarPedidosCocina();
}


window.onload = obtenerPedidosCocina;
setInterval(obtenerPedidosCocina, 15000);