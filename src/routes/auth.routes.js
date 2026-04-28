const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const router = express.Router();
const SECRET_KEY = 'password1';

// Máximo de fallos antes de bloquear
const MAX_ATTEMPTS = 4;

// Bloqueos progresivos por usuario
const BLOCK_TIMES_MS = [
    10 * 1000,
    15 * 1000,
    20 * 1000
];

// Límites máximos de caracteres para evitar datos demasiado largos
const MAX_USERNAME_LENGTH = 20;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 70;

// Validación de contraseña fuerte
const isStrongPassword = (password) => {
    const minLength = 8; // Mínimo 8 carácteres por contraseña
    const hasUppercase = /[A-Z]/.test(password); // Minimo una letra mayúscula
    const hasNumber = /[0-9]/.test(password); // Mínimo un número
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password); // Mínimo un carácter especial

    return (
        password.length >= minLength &&
        hasUppercase &&
        hasNumber &&
        hasSpecialChar
    );
};

// Comprueba que un valor sea un texto válido.
// Esto evita que lleguen objetos, arrays, null, números, etc.
const isValidString = (value) => {
    return typeof value === 'string' && value.trim().length > 0;
};

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, email } = req.body;

        // Validamos que todos los campos esperados sean strings reales.
        // Esto evita payloads NoSQL como { "$ne": null }.
        if (
            !isValidString(username) ||
            !isValidString(password) ||
            !isValidString(name) ||
            !isValidString(email)
        ) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios y deben ser texto válido'
            });
        }

        // Normalizamos los datos quitando espacios innecesarios
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Para validar que tienen un tamaño maximo de caractares. 
        // Solo con usar max.length en el front no sirve para validarlo bien.
        if (cleanUsername.length > MAX_USERNAME_LENGTH) {
            return res.status(400).json({
                error: `El usuario no puede superar los ${MAX_USERNAME_LENGTH} caracteres`
            });
        }

        if (cleanName.length > MAX_NAME_LENGTH) {
            return res.status(400).json({
                error: `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres`
            });
        }

        if (cleanEmail.length > MAX_EMAIL_LENGTH) {
            return res.status(400).json({
                error: `El email no puede superar los ${MAX_EMAIL_LENGTH} caracteres`
            });
        }

        // Validación de contraseña segura
        if (!isStrongPassword(cleanPassword)) {
            return res.status(400).json({
                error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial'
            });
        }

        const user = new User({
            username: cleanUsername,
            password: cleanPassword,
            name: cleanName,
            email: cleanEmail,
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

        // Validamos que username y password sean strings reales.
        // Evita payloads NoSQL como { "$ne": null }.
        if (!isValidString(username) || !isValidString(password)) {
            return res.status(400).json({
                error: 'Usuario y contraseña deben ser texto válido'
            });
        }

        // Normalizamos usuario y contraseña
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();
                
        // Validamos longitud del usuario también en login.
        if (cleanUsername.length > MAX_USERNAME_LENGTH) {
            return res.status(400).json({
                error: `El usuario no puede superar los ${MAX_USERNAME_LENGTH} caracteres`
            });
        }

        const user = await User.findOne({ username: cleanUsername });

        // Si el usuario no existe, no podemos bloquear una cuenta concreta
        if (!user) {
            return res.status(401).json({
                error: 'Usuario o contraseña incorrectos'
            });
        }

        // Inicializamos campos por si el usuario ya existía antes de añadirlos al modelo
        user.failedLoginAttempts ??= 0;
        user.loginBlockCount ??= 0;
        user.blockedUntil ??= null;
        user.isAdminBlocked ??= false;

        // Si la cuenta está bloqueada por admin
        if (user.isAdminBlocked) {
            return res.status(403).json({
                error: 'Cuenta bloqueada. Contacta con un administrador.'
            });
        }

        // Si sigue bloqueada temporalmente
        if (user.blockedUntil && user.blockedUntil > Date.now()) {
            const retryAfterSeconds = Math.ceil(
                (user.blockedUntil.getTime() - Date.now()) / 1000
            );

            return res.status(429).json({
                error: 'Cuenta bloqueada temporalmente.',
                retryAfterSeconds
            });
        }

        // Si el bloqueo temporal ya caducó, lo limpiamos
        if (user.blockedUntil && user.blockedUntil <= Date.now()) {
            user.blockedUntil = null;
            await user.save();
        }

        // Contraseña incorrecta
        if (!(await bcrypt.compare(cleanPassword, user.password))) {
            user.failedLoginAttempts += 1;

            if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
                const blockIndex = user.loginBlockCount;

                // Si ya superó los 3 bloqueos temporales, queda bloqueado por admin
                if (blockIndex >= BLOCK_TIMES_MS.length) {
                    user.isAdminBlocked = true;
                    user.failedLoginAttempts = 0;
                    user.blockedUntil = null;

                    await user.save();

                    return res.status(403).json({
                        error: 'Cuenta bloqueada. Contacta con un administrador.'
                    });
                }

                // Bloqueo progresivo: 10s, 15s, 20s
                const blockTimeMs = BLOCK_TIMES_MS[blockIndex];

                user.loginBlockCount += 1;
                user.failedLoginAttempts = 0;
                user.blockedUntil = new Date(Date.now() + blockTimeMs);

                await user.save();

                return res.status(429).json({
                    error: 'Cuenta bloqueada temporalmente.',
                    retryAfterSeconds: Math.ceil(blockTimeMs / 1000)
                });
            }

            await user.save();

            return res.status(401).json({
                error: 'Usuario o contraseña incorrectos',
                remainingAttempts: MAX_ATTEMPTS - user.failedLoginAttempts
            });
        }

        // Login correcto
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        // Limpiamos fallos actuales, pero NO loginBlockCount
        user.failedLoginAttempts = 0;
        user.loginBlockCount = 0;
        user.blockedUntil = null;
        user.isAdminBlocked = false;

        await user.save();

        res.json({ token });

    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;