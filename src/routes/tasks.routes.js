const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/user.model');

// Obtener tareas según el rol
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        let tasks;

        if (req.userRole === 'admin') {
            const allTasks = await Task.find();
            const users = await User.find({}, 'username');

            const userMap = {};
            users.forEach(user => {
                userMap[user._id.toString()] = user.username;
            });

            tasks = allTasks.map(task => ({
                ...task.toObject(),
                username: userMap[task.userId] || 'Desconocido'
            }));
        } else {
            tasks = await Task.find({ userId: req.userId });
        }

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Agregar una nueva tarea con imagen opcional
router.post('/tasks', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

        const newTask = new Task({
            title,
            status: 'pendiente',
            imageUrl,
            userId: req.userId
        });

        await newTask.save();
        res.json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la tarea' });
    }
});

// Actualizar estado de una tarea
router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pendiente', 'en_progreso', 'completada'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        let task;

        if (req.userRole === 'admin') {
            task = await Task.findById(id);
        } else {
            task = await Task.findOne({ _id: id, userId: req.userId });
        }

        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada o no tienes permiso para modificarla' });
        }

        task.status = status;
        await task.save();

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la tarea' });
    }
});

// Eliminar una tarea
router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        let task;

        if (req.userRole === 'admin') {
            task = await Task.findById(id);
        } else {
            task = await Task.findOne({ _id: id, userId: req.userId });
        }

        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada o no tienes permiso para eliminarla' });
        }

        await Task.findByIdAndDelete(id);

        res.json({ message: 'Tarea eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
});

module.exports = router;