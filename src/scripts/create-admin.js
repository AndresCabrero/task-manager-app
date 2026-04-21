require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI;

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado a MongoDB');

        const existingAdmin = await User.findOne({ username: 'admin' });

        if (existingAdmin) {
            console.log('El usuario admin ya existe');
            process.exit(0);
        }

        const admin = new User({
            username: 'admin',
            password: 'admin1234',
            name: 'Administrador',
            email: 'admin@example.com',
            role: 'admin'
        });

        await admin.save();

        console.log('Usuario administrador creado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('Error al crear el admin:', error.message);
        process.exit(1);
    }
}

createAdmin();