const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const Category = require('../models/category');

const router = express.Router();

// Obtener categorías del usuario
router.get('/categories', authMiddleware, async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.userId });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// Crear categoría
router.post('/categories', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        const newCategory = new Category({
            name,
            userId: req.userId
        });

        await newCategory.save();
        res.json(newCategory);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

// Eliminar categoría
router.delete('/categories/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findOne({
            _id: id,
            userId: req.userId
        });

        if (!category) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        await Category.findByIdAndDelete(id);

        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

module.exports = router;