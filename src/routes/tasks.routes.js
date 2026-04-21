const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
const Task = require('../models/Task');

// Obtener todas las tareas
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Agregar una nueva tarea
router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: "El título es obligatorio" });

        const newTask = new Task({ title, completed: false, userId: req.userId });
        await newTask.save();
        res.json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la tarea' });
    }
});

// Actualizar una tarea
router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ error: "Tarea no encontrada" });
        }

        task.completed = completed;
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
        await Task.findByIdAndDelete(id);
        res.json({ message: "Tarea eliminada" });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
});

module.exports = router;