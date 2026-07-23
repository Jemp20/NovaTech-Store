const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const pedidosRoutes = require('./routes/pedidos');
const pagosRoutes = require('./routes/pagos');
const usuariosRoutes = require('./routes/usuarios');
const estadisticasRoutes = require('./routes/estadisticas');
const cuponesRoutes = require('./routes/cupones');
const favoritosRoutes = require('./routes/favoritos');
const resenasRoutes = require('./routes/resenas');
const boldRoutes = require('./routes/bold');

const app = express();

app.use(cors());

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/cupones', cuponesRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/resenas', resenasRoutes);
app.use('/api/bold', boldRoutes);

app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de NovaTech Store funcionando 🚀'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;