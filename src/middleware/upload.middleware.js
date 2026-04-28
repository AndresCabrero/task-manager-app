const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tamaño máximo permitido: 2 MB
const MAX_FILE_SIZE = 2 * 2024 * 2024;

// Tipos permitidos
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
    }
});

const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    // Primera barrera: extensión permitida
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return cb(new Error('Extensión de archivo no permitida'));
    }

    // Segunda barrera: MIME declarado permitido
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('Tipo de archivo no permitido'));
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Validación real del archivo una vez subido.
// Esto comprueba la firma interna del archivo, no solo la extensión o el MIME.
const validateUploadedImage = async (req, res, next) => {
    try {
        // Si la tarea no lleva imagen, seguimos normal
        if (!req.file) {
            return next();
        }

        // file-type es ESM, por eso lo importamos dinámicamente desde CommonJS
        const { fileTypeFromFile } = await import('file-type');

        const fileType = await fileTypeFromFile(req.file.path);

        // Si no detecta tipo real, no es una imagen válida
        if (!fileType) {
            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                error: 'El archivo subido no es una imagen válida'
            });
        }

        // Comprobamos MIME real del archivo
        if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                error: 'El archivo subido no corresponde a una imagen permitida'
            });
        }

        next();

    } catch (error) {
        // Si algo falla y el archivo existe, lo eliminamos
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Error al validar la imagen subida'
        });
    }
};

module.exports = {
    upload,
    validateUploadedImage
};