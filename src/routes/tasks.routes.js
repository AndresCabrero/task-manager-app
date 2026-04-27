const express = require('express');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();
const Task = require('../models/task');
const User = require('../models/user.model');
const Category = require('../models/category');

// Límite máximo para el título de una tarea
const MAX_TASK_TITLE_LENGTH = 30;

// Ruta solo para administradores: ver todas las tareas
router.get('/admin/tasks', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const allTasks = await Task.find().populate('categories');
        const users = await User.find({}, 'username');

        const userMap = {};
        users.forEach(user => {
            userMap[user._id.toString()] = user.username;
        });

        const tasks = allTasks.map(task => ({
            ...task.toObject(),
            username: userMap[task.userId] || 'Desconocido'
        }));

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas de administrador' });
    }
});

// Obtener tareas según el rol
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        let tasks;

        if (req.userRole === 'admin') {
            const allTasks = await Task.find().populate('categories');
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
            tasks = await Task.find({ userId: req.userId }).populate('categories');
        }

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Agregar una nueva tarea con imagen opcional y categorías
router.post('/tasks', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, categories } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        // Validar que el titulo no supera el máximo de carateres indicados
        if (title.length > MAX_TASK_TITLE_LENGTH) {
            return res.status(400).json({
                error: `El título no puede superar los ${MAX_TASK_TITLE_LENGTH} caracteres`
            });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

        let categoryIds = [];

        if (categories) {
            const parsedCategories = typeof categories === 'string'
                ? JSON.parse(categories)
                : categories;

            const validCategories = await Category.find({
                _id: { $in: parsedCategories },
                userId: req.userId
            });

            categoryIds = validCategories.map(category => category._id);
        }

        const newTask = new Task({
            title,
            status: 'pendiente',
            imageUrl,
            categories: categoryIds,
            userId: req.userId
        });

        await newTask.save();
        const savedTask = await Task.findById(newTask._id).populate('categories');

        res.json(savedTask);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la tarea' });
    }
});

// Actualizar tarea (título y/o estado)
router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, title } = req.body;

        const validStatuses = ['pendiente', 'en_progreso', 'completada'];

        let task;

        if (req.userRole === 'admin') {
            task = await Task.findById(id);
        } else {
            task = await Task.findOne({ _id: id, userId: req.userId });
        }

        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada o no tienes permiso para modificarla' });
        }

        if (status !== undefined) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Estado no válido' });
            }

            task.status = status;
        }

        if (title !== undefined) {
            const trimmedTitle = title.trim();

            if (!trimmedTitle) {
                return res.status(400).json({ error: 'El título no puede estar vacío' });
            }

            // Validamos también cuando se edita una tarea para que no supere el máximo de caracteres establecidos
            if (trimmedTitle.length > MAX_TASK_TITLE_LENGTH) {
                return res.status(400).json({
                    error: `El título no puede superar los ${MAX_TASK_TITLE_LENGTH} caracteres`
                });
            }

            task.title = trimmedTitle;
        }
        await task.save();

        const updatedTask = await Task.findById(task._id).populate('categories');
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la tarea' });
    }
});

// Actualizar categorías de una tarea
router.put('/tasks/:id/categories', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { categories } = req.body;

        let task;

        if (req.userRole === 'admin') {
            task = await Task.findById(id);
        } else {
            task = await Task.findOne({ _id: id, userId: req.userId });
        }

        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada o no tienes permiso para modificarla' });
        }

        const validCategories = await Category.find({
            _id: { $in: categories || [] },
            userId: req.userId
        });

        task.categories = validCategories.map(category => category._id);
        await task.save();

        const updatedTask = await Task.findById(task._id).populate('categories');
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar categorías de la tarea' });
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

        // Borrar imagen física si existe
        if (task.imageUrl) {
            const imagePath = path.join(__dirname, '../../', task.imageUrl);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Task.findByIdAndDelete(id);

        res.json({ message: 'Tarea eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
});

module.exports = router;