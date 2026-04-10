const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 8;


// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//  BASE DE DATOS
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/SaleroBeach';

mongoose.connect(mongoURI)
    .then(() => {
        console.log('Conexión exitosa a la base de datos');
        crearAdminInicial();
    })
    .catch(err => console.error('Error al conectar:', err));

// --- MODELOS ---

// Usuarios
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: 'camarero' },
    nombreReal: String
});
const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

// 2. Productos
const productoSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    precio: Number,
    categoria: String,
    sub: String,
    imagen: String,
    disponible: { type: Boolean, default: true }
});
const Producto = mongoose.model('Producto', productoSchema, 'productos');

//Pedidos
const pedidoSchema = new mongoose.Schema({
    mesa: String,
    items: [{
        nombre: String,
        precio: Number,
        cantidad: Number,
        sub: String,
        imagen: String,
        nota: String,
        // ESTADO POR PRODUCTO: 'Cocina', 'Listo', 'Entregado'
        estadoItem: { type: String, default: 'Cocina' } 
    }],
    total: Number,
    estado: { type: String, default: 'Pendiente' },
    // CAMARERO ASIGNADO: Por defecto 'Cliente (QR)' hasta que alguien lo tome
    camareroAsignado: { type: String, default: 'Cliente (QR)' },
    fecha: { type: Date, default: Date.now }
});
const Pedido = mongoose.model('Pedido', pedidoSchema, 'pedidos');


const mesaSchema = new mongoose.Schema({
    numero: { type: String, required: true, unique: true },
    zona: String,
    capacidad: Number,
    activa: { type: Boolean, default: true }, // Para habilitar/deshabilitar
    estado: { type: String, default: 'libre' } // 'libre', 'ocupada'
});
const Mesa = mongoose.model('Mesa', mesaSchema);

// Cambiar estado de activación de una mesa (Solo Barra/Admin)
app.patch('/api/mesas/:numero/activar', async (req, res) => {
    try {
        const { numero } = req.params;
        const { activa } = req.body; // true o false

        const mesa = await Mesa.findOneAndUpdate(
            { numero: numero },
            { activa: activa },
            { new: true }
        );

        res.json({ mensaje: `Mesa ${numero} ${activa ? 'habilitada' : 'deshabilitada'}`, mesa });
    } catch (error) {
        res.status(500).send("Error al actualizar mesa");
    }
});


// --- OBTENER TODAS LAS MESAS (Para la Barra y el Camarero) ---
app.get('/api/mesas', async (req, res) => {
    try {
        const mesas = await Mesa.find().sort({ numero: 1 }); // Las trae ordenadas
        res.json(mesas);
    } catch (error) {
        console.error("Error al obtener mesas:", error);
        res.status(500).send("Error al obtener las mesas");
    }
});

// --- RUTA POST PARA CREAR UNA MESA ---
app.post('/api/mesas', async (req, res) => {
    try {
        const { numero, zona } = req.body;

        if (!numero || !zona) {
            return res.status(400).send("Falta el número o la zona de la mesa");
        }

        // Comprobamos si la mesa ya existe para no duplicar
        const existe = await Mesa.findOne({ numero: numero.toString() });
        if (existe) {
            return res.status(409).send("Esa mesa ya existe");
        }

        // Creamos la mesa con estado 'libre' y 'activa' por defecto
        const nuevaMesa = new Mesa({
            numero: numero.toString(),
            zona: zona, // 'terraza' o 'interior'
            activa: true,
            estado: 'libre'
        });

        await nuevaMesa.save();
        console.log(`Mesa ${numero} creada en zona ${zona}.`);
        res.status(201).json(nuevaMesa);
    } catch (error) {
        console.error("Error al crear mesa:", error);
        res.status(500).send("Error interno al crear la mesa");
    }
});

// funcion que crea un Administrador para probar el login
async function crearAdminInicial() {
    const existe = await Usuario.findOne({ username: 'Admin1_resto' });
    if (!existe) {
        const hash = await bcrypt.hash('abc123.', saltRounds)
        await Usuario.create({
            username: 'Admin1_resto',
            password: hash,
            nombreReal: 'Staff_Barra',
            rol: 'barra'
        });
        console.log("Usuario Admin1_resto creado con éxito");
    }
}

// --- RUTAS DE PRODUCTOS ---

app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).send("Error al obtener productos");
    }
});

app.get('/api/productos/cliente', async (req, res) => {
    try {
        const productos = await Producto.find({ disponible: { $ne: false } });
        res.json(productos);
    } catch (error) {
        res.status(500).send("Error al obtener productos");
    }
});

app.patch('/api/productos/:id/disponibilidad', async (req, res) => {
    try {
        const { disponible } = req.body;
        await Producto.findByIdAndUpdate(req.params.id, { disponible });
        res.send("Disponibilidad actualizada");
    } catch (error) {
        res.status(500).send("Error");
    }
});

// --- RUTAS DE PEDIDOS ---

// Crear nuevo pedido
app.post('/api/pedidos', async (req, res) => {
    try {
        const nuevoPedido = new Pedido({
            mesa: req.body.mesa,
            items: req.body.items || [],
            total: req.body.total || 0,
            estado: 'Pendiente',
            // Si viene del camarero, lo asignamos, si no, es QR
            camareroAsignado: req.body.camareroAsignado || 'Cliente (QR)'
        });
        await nuevoPedido.save();
        res.status(201).json(nuevoPedido);
    } catch (error) {
        console.error("ERROR AL CREAR:", error);
        res.status(500).send("Error al guardar el pedido");
    }
});

// Pedidos activos (Barra y Sala)
app.get('/api/pedidos/pendientes', async (req, res) => {
    try {
        // 'Archivado' y 'Pagado' NO entran aquí, por eso desaparecen de la vista
        const pedidos = await Pedido.find({
            estado: { $in: ['Pendiente', 'Listo', 'Cancelado'] }
        }).sort({ fecha: -1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).send("Error");
    }
});

// Historial (Todo lo que ya terminó)
app.get('/api/pedidos/historial', async (req, res) => {
    try {
        const historial = await Pedido.find({
            estado: { $in: ['Pagado', 'Cancelado', 'Archivado'] }
        }).sort({ fecha: -1 });
        res.json(historial);
    } catch (error) {
        res.status(500).send("Error");
    }
});


// RUTA CLAVECAMBIO DE ESTADO 

app.patch('/api/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // Recibe 'Archivado', 'Cancelado', 'Listo' o 'Pagado'

        const pedidoActualizado = await Pedido.findByIdAndUpdate(
            id,
            { estado: estado },
            { new: true }
        );

        if (!pedidoActualizado) return res.status(404).send("Pedido no encontrado");
        res.json({ success: true, estado: pedidoActualizado.estado });
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        res.status(500).send("Error interno");
    }
});

// --- RUTAS DE GESTIÓN DE ITEMS ---

app.patch('/api/pedidos/:id/quitar-item', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).send("No encontrado");

        const index = pedido.items.findIndex(item => item.nombre === nombre);
        if (index > -1) {
            if (pedido.items[index].cantidad > 1) {
                pedido.items[index].cantidad -= 1;
            } else {
                pedido.items.splice(index, 1);
            }
            pedido.total = pedido.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
            await pedido.save();
            res.json(pedido);
        } else {
            res.status(404).send("Item no encontrado");
        }
    } catch (error) {
        res.status(500).send("Error");
    }
});

app.patch('/api/pedidos/:id/anadir-item', async (req, res) => {
    try {
        const { id } = req.params;
        const nuevoItem = req.body;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).send("No encontrado");

        const itemExistente = pedido.items.find(item => item.nombre === nuevoItem.nombre && item.nota === nuevoItem.nota);
        if (itemExistente) {
            itemExistente.cantidad += 1;
        } else {
            pedido.items.push({ ...nuevoItem, cantidad: 1 });
        }
        pedido.total = pedido.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        await pedido.save();
        res.json(pedido);
    } catch (error) {
        res.status(500).send("Error");
    }
});

// --- LOGIN con bcrypt para encriptar las contraseñas ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Buscamos al usuario solo por nombre
        const user = await Usuario.findOne({ username });

        // 2. Si el usuario no existe, cortamos aquí
        if (!user) {
            return res.status(401).json({ success: false, mensaje: "Usuario o contraseña incorrectos" });
        }

        // 3. Comparamos la contraseña plana con la encriptada de la DB
        const coinciden = await bcrypt.compare(password, user.password);

        if (coinciden) {
            // Si coinciden, devolvemos los datos para el localStorage
            res.json({
                success: true,
                nombre: user.nombreReal,
                rol: user.rol
            });
        } else {
            // Si no coinciden
            res.status(401).json({ success: false, mensaje: "Usuario o contraseña incorrectos" });
        }

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// 2. Ruta para OBTENER usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '-password');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar" });
    }
});

// Ruta para CREAR usuarios
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nombreReal, username, password, rol } = req.body;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const nuevo = new Usuario({
            nombreReal,
            username,
            password: hashedPassword,
            rol
        });
        await nuevo.save();
        res.status(201).send("Usuario creado");
    } catch (error) {
        res.status(500).send("Error al guardar");
    }
});


//Rura para eliminar usuarios
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await Usuario.findByIdAndDelete(req.params.id);
        res.send("Usuario eliminado correctamente");
    } catch (error) {
        res.status(500).send("Error al eliminar usuario");
    }
});

// RUTA PARA ASIGNAR UN CAMARERO A UN PEDIDO (QR O NUEVO)
app.patch('/api/pedidos/:id/asignar', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombreCamarero } = req.body;

        if (!nombreCamarero) {
            return res.status(400).send("El nombre del camarero es obligatorio");
        }

        const pedidoActualizado = await Pedido.findByIdAndUpdate(
            id,
            { camareroAsignado: nombreCamarero },
            { new: true } // Para que devuelva el pedido ya modificado
        );

        if (!pedidoActualizado) {
            return res.status(404).send("Pedido no encontrado");
        }

        console.log(`✅ Pedido ${id} asignado a ${nombreCamarero}`);
        res.json(pedidoActualizado);
    } catch (error) {
        console.error("Error al asignar camarero:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(` Salero Bar funcionando en el puerto: ${PORT}`);
});
// La doc sugiere aumentar estos valores para evitar "Connection reset"
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;