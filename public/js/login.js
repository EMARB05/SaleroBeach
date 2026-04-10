async function manejarLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if(!user || !pass) return alert("Rellena todos los campos");

    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            //Guardamos los datos clave
            localStorage.setItem('usuarioNombre', resultado.nombre);
            localStorage.setItem('usuarioRol', resultado.rol); //Guardo si es barra o camarero

            // Redirección basada en el ROL que viene de la BD
            if (resultado.rol === 'barra') {
                window.location.href = 'barra.html';
            } else if(resultado.rol==='camarero') {
                // Si es camarero (o cualquier otro rol por defecto)
                window.location.href = 'camarero.html';
            }
            else if(resultado.rol=='cocinero'){
                window.location.href='cocina.html'
            }
        } else {
            alert("❌ " + resultado.mensaje);
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
}