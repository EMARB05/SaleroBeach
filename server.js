const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express(); // 1º Creamos la aplicación

// 2º Configuramos los Middlewares (Permisos y JSON)
app.use(cors()); 
app.use(express.json());

// 3º Servimos los archivos estáticos de tu carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// 4º Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// 1. Esquema y Modelo de Usuarios
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nombreReal: String
});
const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

  // Función para crear el admin inicial si no existe
async function crearAdminInicial() {
    const existe = await Usuario.findOne({ username: 'Admin1_resto' });
    if (!existe) {
        await Usuario.create({
            username: 'Admin1_resto',
            password: 'abc123.', // Pon la que quieras
            nombreReal: 'Staff_Barra'
        });
        console.log("👤 Usuario Admin1_resto creado con éxito");
    }
}
// Llama a la función después de conectar a Mongo
// Usamos una variable de entorno para la seguridad
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/SaleroBeach';

mongoose.connect(mongoURI)
  .then(() => {
      console.log('✅ Conexión exitosa a la base de datos');
      crearAdminInicial();
  })
  .catch(err => console.error('❌ Error al conectar:', err));

// 6º Esquema y Modelo
const productoSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    precio: Number,
    categoria: String,
    sub: String,
    imagen: String
});
const Producto = mongoose.model('Producto', productoSchema, 'productos');

// 7º Ruta de la API
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).send("Error al obtener productos");
    }
});


// 1. Esquema para los Pedidos (Orders)
const pedidoSchema = new mongoose.Schema({
    // Definimos la estructura interna de cada item para que tengan su propio ID
    items: [{
        nombre: String,
        precio: Number,
        sub: String,
        imagen:String,
        nota: String,
        cantidad: { type: Number, default: 1 }
    }],
    total: Number,
    mesa: String,
    fecha: { type: Date, default: Date.now },
    estado: { type: String, default: 'Pendiente' }
});

const Pedido = mongoose.model('Pedido', pedidoSchema, 'pedidos');


// 2. RUTA POST: Para recibir el pedido del cliente y guardarlo en la DB
app.post('/api/pedidos', async (req, res) => {
    try {
        const nuevoPedido = new Pedido(req.body); // Recibe { items, total }
        await nuevoPedido.save();
        res.status(201).json({ mensaje: "✅ Pedido guardado con éxito", id: nuevoPedido._id });
    } catch (error) {
        console.error("Error al guardar pedido:", error);
        res.status(500).send("Error al procesar el pedido");
    }
});


app.get('/api/pedidos/pendientes', async (req, res) => {
    try {
        // Incluimos 'Cancelado' para que la barra lo vea antes de borrarlo
        const pedidos = await Pedido.find({ 
            estado: { $in: ['Pendiente', 'Listo', 'Cancelado'] } 
        }).sort({ fecha: -1 }); 
        
        res.json(pedidos);
    } catch (error) {
        res.status(500).send("Error al obtener pedidos");
    }
});

// 3. Ruta para el HISTORY 
app.get('/api/pedidos/historial', async (req, res) => {
    try {
        const historial = await Pedido.find({ 
            estado: { $in: ['Pagado', 'Cancelado'] } 
        }).sort({ fecha: -1 });
        res.json(historial);
    } catch (error) {
        res.status(500).send("Error al obtener el historial");
    }
});
// 4. Ruta para CAMBIAR A PAGADO (PATCH)
app.patch('/api/pedidos/:id/pagar', async (req, res) => {
    try {
        await Pedido.findByIdAndUpdate(req.params.id, { estado: 'Pagado' });
        res.send("Pedido pagado correctamente");
    } catch (error) {
        res.status(500).send("Error al procesar el pago");
    }
});



// 2. RUTA POST para el Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Buscamos un usuario que coincida exactamente con lo enviado
        const user = await Usuario.findOne({ username, password });

        if (user) {
            res.json({ success: true, nombre: user.nombreReal });
        } else {
            res.status(401).json({ success: false, mensaje: "Credenciales inválidas" });
        }
    } catch (error) {
        res.status(500).send("Error en el servidor");
    }
});

app.patch('/api/pedidos/:id/cancelar', async (req, res) => {
    try {
        // ✅ Cambiamos el estado a Cancelado en lugar de borrarlo
        await Pedido.findByIdAndUpdate(req.params.id, { estado: 'Cancelado' });
        res.send("Pedido cancelado con éxito");
    } catch (error) {
        res.status(500).send("Error al cancelar el pedido");
    }
});

app.patch('/api/pedidos/:id/completar', async (req, res) => {
    try {
        // Cambiamos a 'Listo'. La barra seguirá viéndolo.
        await Pedido.findByIdAndUpdate(req.params.id, { estado: 'Listo' });
        res.send("Pedido marcado como listo");
    } catch (error) {
        res.status(500).send("Error al completar");
    }
});


// NUEVA RUTA Para quitar un artículo específico de un pedido
app.patch('/api/pedidos/:id/quitar-item', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).send("Pedido no encontrado");

        // Buscamos el ítem por nombre
        const index = pedido.items.findIndex(item => item.nombre === nombre);

        if (index > -1) {
            const itemEncontrado = pedido.items[index];

            if (itemEncontrado.cantidad > 1) {
                // Si hay más de uno, solo restamos 1 a la cantidad
                itemEncontrado.cantidad -= 1;
            } else {
                // Si solo queda uno, eliminamos el objeto del array
                pedido.items.splice(index, 1);
            }
            
            // Recalculamos el total: (precio * cantidad) de cada ítem restante
            pedido.total = pedido.items.reduce((acc, item) => {
                return acc + ((item.precio || 0) * (item.cantidad || 1));
            }, 0);
            
            await pedido.save();
            res.json({ mensaje: "Cantidad actualizada", pedido });
        } else {
            res.status(404).send("El artículo ya no está en el pedido");
        }
    } catch (error) {
        console.error("Error al quitar item:", error);
        res.status(500).send("Error interno");
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Salero Bar funcionando en http://localhost:${PORT}`);
});