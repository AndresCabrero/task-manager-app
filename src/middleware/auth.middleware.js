const jwt = require('jsonwebtoken');
const SECRET_KEY = 'mi_secreto';

module.exports = (req, res, next) => {

    const token = req.headers.authorization?.split(' ');
    
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};