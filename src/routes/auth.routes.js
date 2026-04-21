const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const router = express.Router();
const SECRET_KEY = 'mi_secreto'; // Más adelante una clave mas fuerte para que sea más seguro

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, email } = req.body;

        const user = new User({
            username,
            password,
            name,
            email,
            role: 'user'
        });

        await user.save();
        res.status(201).json({ message: 'Usuario creado' });
    } catch (error) {
        res.status(400).json({ error: 'El usuario ya existe o los datos no son válidos' });
    }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;