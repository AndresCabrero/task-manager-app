require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

const taskRoutes = require('./routes/tasks.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api', taskRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});