const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ibuy_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super_secret_refresh_key';

// 1. REGISTRAZIONE DI UN NUOVO UTENTE (POST /utenti)
// #swagger.tags = ['Autenticazione']
// #swagger.summary = 'Registra un nuovo utente nel sistema'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Dati necessari per la registrazione dell utente',
    required: true,
    schema: {
        username: 'mario_rossi',
        mail: 'mario.rossi@email.com',
        password: 'password123'
    }
} */
const registraUtente = async (req, res) => {
    try {
        const { username, mail, password } = req.body;

        if (!username || !mail || !password) {
            return res.status(400).json({ errore: "Tutti i campi (username, mail, password) sono obbligatori." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO utente (username, mail, password) 
            VALUES ($1, $2, $3) 
            RETURNING username;
        `;
        const result = await db.query(query, [username, mail, hashedPassword]);

        return res.status(201).json({
            messaggio: "Utente registrato con successo.",
            username: result.rows[0].username
        });

    } catch (err) {
        console.error("Errore durante la registrazione:", err);
        if (err.code === '23505') {
            return res.status(400).json({ errore: "Username o indirizzo email già esistenti nel sistema." });
        }
        return res.status(500).json({ errore: "Errore interno del server durante la registrazione." });
    }
};

// 2. LOGIN (Genera Access Token e Refresh Token salvandolo nel DB)
// #swagger.tags = ['Autenticazione']
// #swagger.summary = 'Effettua il login generando Access e Refresh Token'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Credenziali per il login',
    required: true,
    schema: {
        username: 'mario_rossi',
        password: 'password123'
    }
} */
const loginUtente = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ errore: "Username e password sono obbligatori." });
        }

        const result = await db.query(`SELECT password FROM utente WHERE username = $1;`, [username]);
        if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) {
            return res.status(401).json({ errore: "Credenziali non valide." });
        }

        const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ username }, REFRESH_SECRET, { expiresIn: '7d' });

        await db.query(
            `INSERT INTO refresh_token (token, username_utente) VALUES ($1, $2);`,
            [refreshToken, username]
        );

        return res.status(200).json({ accessToken, refreshToken });
    } catch (err) {
        console.error("Errore durante il login:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 3. REFRESH TOKEN CON ROTAZIONE (POST /refresh)
// #swagger.tags = ['Autenticazione']
// #swagger.summary = 'Esegue il refresh del token di autenticazione con rotazione'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Refresh token attivo',
    required: true,
    schema: {
        refreshToken: 'il_tuo_refresh_token_qui'
    }
} */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ errore: "Refresh token mancante." });
        }

        const dbTokenCheck = await db.query(`SELECT * FROM refresh_token WHERE token = $1;`, [refreshToken]);
        if (dbTokenCheck.rows.length === 0) {
            return res.status(403).json({ errore: "Refresh token non valido o già utilizzato (rotazione compromessa)." });
        }

        jwt.verify(refreshToken, REFRESH_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ errore: "Refresh token scaduto o non valido." });
            }

            const username = user.username;

            await db.query(`DELETE FROM refresh_token WHERE token = $1;`, [refreshToken]);

            const newAccessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '15m' });
            const newRefreshToken = jwt.sign({ username }, REFRESH_SECRET, { expiresIn: '7d' });

            await db.query(
                `INSERT INTO refresh_token (token, username_utente) VALUES ($1, $2);`,
                [newRefreshToken, username]
            );

            return res.status(200).json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        });
    } catch (err) {
        console.error("Errore durante il refresh:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 4. LOGOUT (Elimina il refresh token dal database)
// #swagger.tags = ['Autenticazione']
// #swagger.summary = 'Esegue il logout invalidando il refresh token'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Refresh token da invalidare',
    required: true,
    schema: {
        refreshToken: 'il_tuo_refresh_token_qui'
    }
} */
const logoutUtente = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ errore: "Refresh token mancante per il logout." });
        }

        await db.query(`DELETE FROM refresh_token WHERE token = $1;`, [refreshToken]);
        return res.status(200).json({ messaggio: "Logout effettuato con successo." });
    } catch (err) {
        console.error("Errore durante il logout:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

module.exports = {
    registraUtente,
    loginUtente,
    refreshToken,
    logoutUtente
};