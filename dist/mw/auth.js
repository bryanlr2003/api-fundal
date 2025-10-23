import jwt from 'jsonwebtoken';
export function requireAuth(req, res, next) {
    const h = req.headers.authorization ?? '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token)
        return res.status(401).json({ error: 'No autorizado' });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
}
