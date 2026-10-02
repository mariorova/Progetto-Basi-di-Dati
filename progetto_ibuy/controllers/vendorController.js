const db = require('../db');

// 1. RICERCA VENDITORI CON PAGINAZIONE
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Cerca e recupera la lista dei venditori registrati'
/* #swagger.parameters['q'] = { in: 'query', description: 'Filtro testuale sullo username del venditore', type: 'string' } */
/* #swagger.parameters['size'] = { in: 'query', description: 'Numero di elementi per pagina', type: 'integer' } */
/* #swagger.parameters['page'] = { in: 'query', description: 'Numero della pagina (partendo da 0)', type: 'integer' } */
const getVenditori = async (req, res) => {
    try {
        const { q = '', size = 20, page = 0 } = req.query;
        const limit = parseInt(size);
        const offset = parseInt(page) * limit;

        const query = `
            SELECT v.partita_iva, u.username, u.mail, u.imm_profilo, u.citta 
            FROM venditore v 
            JOIN utente u ON v.username_utente = u.username 
            WHERE u.username ILIKE $1 
            LIMIT $2 OFFSET $3;
        `;
        const result = await db.query(query, [`%${q}%`, limit, offset]);

        const venditori = result.rows.map(v => ({
            username: v.username,
            partita_Iva: v.partita_iva,
            citta: v.citta,
            venditoreLNK: `/venditori/${v.username}`
        }));

        return res.status(200).json({
            page: parseInt(page),
            size: limit,
            q,
            results: venditori
        });
    } catch (err) {
        console.error("Errore nella ricerca dei venditori:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 2. DETTAGLIO SPECIFICO VENDITORE
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Recupera i dettagli di un venditore specifico'
const getVenditoreByUsername = async (req, res) => {
    try {
        const { username } = req.params;

        const query = `
            SELECT v.partita_iva, u.username, u.mail, u.imm_profilo, u.citta, u.via, u.numero_civico, u.cap 
            FROM venditore v 
            JOIN utente u ON v.username_utente = u.username 
            WHERE u.username = $1;
        `;
        const result = await db.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ errore: "Venditore non trovato." });
        }

        const v = result.rows[0];

        return res.status(200).json({
            username: v.username,
            mail: v.mail,
            imm_Profilo: v.imm_profilo,
            citta: v.citta,
            partita_Iva: v.partita_iva,
            prodottiLNK: `/venditori/${v.username}/prodotti`,
            followersLNK: `/venditori/${v.username}/followers`
        });
    } catch (err) {
        console.error("Errore nel recupero del venditore:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 3. PRODOTTI DEL VENDITORE
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Recupera la lista dei prodotti messi in vendita da un venditore'
/* #swagger.parameters['size'] = { in: 'query', description: 'Numero di elementi per pagina', type: 'integer' } */
/* #swagger.parameters['page'] = { in: 'query', description: 'Numero della pagina (partendo da 0)', type: 'integer' } */
const getProdottiVenditore = async (req, res) => {
    try {
        const { username } = req.params;
        const { size = 20, page = 0 } = req.query;
        const limit = parseInt(size);
        const offset = parseInt(page) * limit;

        // Verifica che il venditore esista e recupera la P.IVA
        const venditore = await db.query(`SELECT partita_iva FROM venditore WHERE username_utente = $1;`, [username]);
        if (venditore.rows.length === 0) {
            return res.status(404).json({ errore: "Venditore non trovato." });
        }

        const partitaIva = venditore.rows[0].partita_iva;

        const query = `
            SELECT * FROM prodotto 
            WHERE partita_iva_venditore = $1 
            LIMIT $2 OFFSET $3;
        `;
        const result = await db.query(query, [partitaIva, limit, offset]);

        return res.status(200).json({
            page: parseInt(page),
            size: limit,
            prodotti: result.rows
        });
    } catch (err) {
        console.error("Errore nel recupero dei prodotti del venditore:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 4. LISTA FOLLOWER DEL VENDITORE
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Recupera la lista dei follower di un venditore'
const getFollowersVenditore = async (req, res) => {
    try {
        const { username } = req.params;

        const venditore = await db.query(`SELECT partita_iva FROM venditore WHERE username_utente = $1;`, [username]);
        if (venditore.rows.length === 0) {
            return res.status(404).json({ errore: "Venditore non trovato." });
        }

        const query = `
            SELECT u.username, u.mail, u.imm_profilo 
            FROM segue s 
            JOIN utente u ON s.username_utente = u.username 
            WHERE s.partita_iva_venditore = $1;
        `;
        const result = await db.query(query, [venditore.rows[0].partita_iva]);

        return res.status(200).json({ followers: result.rows });
    } catch (err) {
        console.error("Errore nel recupero dei follower:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 5. INIZIA A SEGUIRE UN VENDITORE (POST)
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Inizia a seguire un venditore'
const seguiVenditore = async (req, res) => {
    try {
        const usernameUtente = req.user.username;
        const { username } = req.params;

        const venditore = await db.query(`SELECT partita_iva FROM venditore WHERE username_utente = $1;`, [username]);
        if (venditore.rows.length === 0) {
            return res.status(404).json({ errore: "Venditore non trovato." });
        }

        const partitaIva = venditore.rows[0].partita_iva;

        // Controllo se lo segue già
        const check = await db.query(`SELECT * FROM segue WHERE username_utente = $1 AND partita_iva_venditore = $2;`, [usernameUtente, partitaIva]);
        if (check.rows.length > 0) {
            return res.status(409).json({ errore: "Segui già questo venditore." });
        }

        await db.query(`INSERT INTO segue (username_utente, partita_iva_venditore) VALUES ($1, $2);`, [usernameUtente, partitaIva]);

        return res.status(201).json({ messaggio: "Ora segui questo venditore." });
    } catch (err) {
        console.error("Errore durante l'operazione segui:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 6. SMETTI DI SEGUIRE UN VENDITORE (DELETE)
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Smette di seguire un venditore'
const smettiSeguireVenditore = async (req, res) => {
    try {
        const usernameUtente = req.user.username;
        const { username } = req.params;

        const venditore = await db.query(`SELECT partita_iva FROM venditore WHERE username_utente = $1;`, [username]);
        if (venditore.rows.length === 0) {
            return res.status(404).json({ errore: "Venditore non trovato." });
        }

        const partitaIva = venditore.rows[0].partita_iva;

        const result = await db.query(`DELETE FROM segue WHERE username_utente = $1 AND partita_iva_venditore = $2;`, [usernameUtente, partitaIva]);

        if (result.rowCount === 0) {
            return res.status(404).json({ errore: "Non segui questo venditore." });
        }

        return res.status(200).json({ messaggio: "Hai smesso di seguire questo venditore." });
    } catch (err) {
        console.error("Errore durante l'operazione smetti di seguire:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

// 7. LISTA DEI VENDITORI SEGUITI DALL'UTENTE LOGGATO
// #swagger.tags = ['Venditori']
// #swagger.summary = 'Recupera la lista dei venditori seguiti dall utente loggato'
const getVenditoriSeguiti = async (req, res) => {
    try {
        const usernameUtente = req.user.username;

        const query = `
            SELECT v.partita_iva, u.username, u.mail, u.imm_profilo, u.citta 
            FROM segue s 
            JOIN venditore v ON s.partita_iva_venditore = v.partita_iva 
            JOIN utente u ON v.username_utente = u.username 
            WHERE s.username_utente = $1;
        `;
        const result = await db.query(query, [usernameUtente]);

        return res.status(200).json({ seguiti: result.rows });
    } catch (err) {
        console.error("Errore nel recupero dei venditori seguiti:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

module.exports = {
    getVenditori,
    getVenditoreByUsername,
    getProdottiVenditore,
    getFollowersVenditore,
    seguiVenditore,
    smettiSeguireVenditore,
    getVenditoriSeguiti
};