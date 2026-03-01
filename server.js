const express = require('express');
const app = express();
const path = require('path');

// Esto sirve para que Node sepa que tus diseños están en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal: cuando entres a la web, te enseña tu index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Salero Bar corriendo en http://localhost:${PORT}`);
});