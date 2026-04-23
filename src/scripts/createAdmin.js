require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingUser = await User.findOne({ username: 'admin' });
    if (existingUser) {
      await User.deleteOne({ username: 'admin' });
      console.log('Admin anterior eliminado');
    }

    const admin = new User({
      username: 'admin',
      email: 'admin@test.com',
      password: '123456',
      name: 'Administrador',
      role: 'admin'
    });

    await admin.save();
    console.log('Admin creado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al crear admin:', error.message);
    process.exit(1);
  }
}

createAdmin();