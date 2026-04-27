const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

const User = require('../models/user.model');
const Task = require('../models/task');
const Category = require('../models/category');

const router = express.Router();

// Estadísticas generales del sistema
// Solo puede acceder un usuario autenticado con rol admin
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalBlockedUsers = await User.countDocuments({ isAdminBlocked: true });
        const totalTasks = await Task.countDocuments();
        const totalCategories = await Category.countDocuments();

        res.json({
            totalUsers,
            totalAdmins,
            totalBlockedUsers,
            totalTasks,
            totalCategories
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener estadísticas del sistema'
        });
    }
});

// Obtener lista de usuarios con búsqueda y filtro
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { search, blocked } = req.query;

        let query = {};

        // Filtro por usuarios bloqueados
        if (blocked === 'true') {
            query.isAdminBlocked = true;
        }

        // Búsqueda por username o email (case insensitive)
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query).select('-password');

        res.json(users);
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener usuarios'
        });
    }
});

// Desbloquear una cuenta bloqueada por seguridad
router.patch('/users/:id/unblock', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Limpiamos todos los campos relacionados con bloqueos e intentos fallidos
        user.failedLoginAttempts = 0;
        user.loginBlockCount = 0;
        user.blockedUntil = null;
        user.isAdminBlocked = false;

        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        res.json({
            message: 'Usuario desbloqueado correctamente',
            user: safeUser
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al desbloquear usuario'
        });
    }
});


// Cambiar rol de un usuario: user/admin
router.patch('/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Solo permitimos roles válidos
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                error: 'Rol no válido'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Protección: no permitir quitar el rol admin al último administrador
        if (user.role === 'admin' && role === 'user') {
            const totalAdmins = await User.countDocuments({ role: 'admin' });

            if (totalAdmins <= 1) {
                return res.status(400).json({
                    error: 'No puedes quitar el rol admin al último administrador'
                });
            }
        }

        user.role = role;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        res.json({
            message: 'Rol actualizado correctamente',
            user: safeUser
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al cambiar el rol del usuario'
        });
    }
});

// Eliminar usuario y todos sus datos asociados
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Protección: no eliminar el último admin
        if (user.role === 'admin') {
            const totalAdmins = await User.countDocuments({ role: 'admin' });

            if (totalAdmins <= 1) {
                return res.status(400).json({
                    error: 'No puedes eliminar el último administrador'
                });
            }
        }

        // Borramos todas sus tareas
        await Task.deleteMany({ userId: id });

        // Borramos todas sus categorías
        await Category.deleteMany({ userId: id });

        // Finalmente borramos el usuario
        await User.findByIdAndDelete(id);

        res.json({
            message: 'Usuario y todos sus datos eliminados correctamente'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al eliminar usuario'
        });
    }
});

module.exports = router;