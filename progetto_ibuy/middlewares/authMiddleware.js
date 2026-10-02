const jwt = require('jsonwebtoken');

const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ errore: "Token mancante." });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'chiave_segreta_super_sicura', (err, user) => {
        if (err) {
            return res.status(403).json({ errore: "Token non valido o scaduto." });
        }
        req.user = user;
        next();
    });
};

// DEVE ESSERE ESPORTATO COSÌ (direttamente la funzione)
module.exports = verificaToken;