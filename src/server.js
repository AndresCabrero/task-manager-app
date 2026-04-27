require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Añadir Hardening y Gestión de Logs
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');

// Añadir RateLimit
const rateLimit = require('express-rate-limit');

const app = express();
app.disable('x-powered-by'); // Para deshabilitar que se vea Express
const PORT = process.env.PORT || 5000;

// Para almacenar logs en archivos para auditoria 
const logsDir = path.join(__dirname, '../logs');

// Para aplicar el RateLimit
const loginLimiter = rateLimit({
    windowMs: 10 * 1000,  /* windowMs: 5 * 60 * 1000, */ // tiempo de bloqueo
    max: 3, // máximo intentos por IP
    message: {
        error: 'Demasiados intentos. Cuenta bloqueada temporalmente durante 5 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

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

app.use('/api', taskRoutes);
app.use('/api', categoryRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});