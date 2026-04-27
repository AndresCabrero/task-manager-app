const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    name: { type: String, required: true, trim: true },

    email: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        lowercase: true 
    },

    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },

    failedLoginAttempts: { // Fallos actuales antes del último bloqueo
        type: Number,
        default: 0
    },

    loginBlockCount: { // Cuantas veces se ha bloqueado la cuenta
        type: Number,
        default: 0
    },

    blockedUntil: { // Hasta cuando está bloqueada temporalmente
        type: Date,
        default: null
    },

    isAdminBlocked: { // Bloqueo definitivo hasta que el administrador lo reactive
        type: Boolean,
        default: false
    }

}, { timestamps: true });

// Hashear la contraseña antes de guardar
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', UserSchema);