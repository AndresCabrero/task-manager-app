require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Hardening y gestión de logs
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 5000;

// Logs para auditoría
const logsDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Conectar a MongoDB
connectDB();

const taskRoutes = require('./routes/tasks.routes');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const adminRoutes = require('./routes/admin.routes'); 

app.use('/api', taskRoutes);
app.use('/api', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});