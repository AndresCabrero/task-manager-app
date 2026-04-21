const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    status: {
        type: String,
        enum: ['pendiente', 'en_progreso', 'completada'],
        default: 'pendiente'
    },
    imageUrl: { type: String, default: '' },

    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],

    userId: { type: String, required: true }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;