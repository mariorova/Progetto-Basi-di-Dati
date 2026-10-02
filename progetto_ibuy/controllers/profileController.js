const db = require('../db');

// 1. VISUALIZZAZIONE DEL PROFILO[cite: 11]
// #swagger.tags = ['Profilo']
// #swagger.summary = 'Recupera le informazioni del profilo utente loggato'
const getProfilo = async (req, res) => {
    try {
        const username = req.user.username;

        const query = `
            SELECT u.username, u.mail, u.imm_profilo, u.via, u.numero_civico, u.cap, v.partita_iva 
            FROM utente u 
            LEFT JOIN venditore v ON u.username = v.username_utente 
            WHERE u.username = $1;
        `;

        const result = await db.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ errore: "Utente non trovato." });
        }

        const utente = result.rows[0];

        return res.status(200).json({
            username: utente.username,
            mail: utente.mail,
            imm_Profilo: utente.imm_profilo,
            indirizzo: {
                via: utente.via,
                numero_Civico: utente.numero_civico,
                CAP: utente.cap
            },
            venditore: utente.partita_iva ? true : false,
            partita_Iva: utente.partita_iva || null
        });

    } catch (err) {
        console.error("Errore nel recupero del profilo:", err);
        return res.status(500).json({ errore: "Errore interno del server nel recupero del profilo." });
    }
};

// 2. MODIFICA DEL PROFILO (PATCH)[cite: 11]
// #swagger.tags = ['Profilo']
// #swagger.summary = 'Aggiorna i dati del profilo utente o lo stato di venditore'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Campi aggiornabili del profilo utente',
    required: false,
    schema: {
        via: 'Via Roma',
        numero_Civico: '10',
        CAP: '00100',
        citta: 'Roma',
        partita_Iva: '12345678901'
    }
} */
const patchProfilo = async (req, res) => {
    try {
        const username = req.user.username;
        const { via, numero_Civico, CAP, citta, partita_Iva } = req.body;
        let imm_Profilo = null;

        if (req.files && req.files.immagine) {
            const file = req.files.immagine;
            imm_Profilo = `${Date.now()}_${file.name}`;
            file.mv(`resources/${imm_Profilo}`);
        }

        const updateUtenteQuery = `
            UPDATE utente 
            SET via = COALESCE($1, via), 
                numero_civico = COALESCE($2, numero_civico), 
                cap = COALESCE($3, cap), 
                citta = COALESCE($4, citta),
                imm_profilo = COALESCE($5, imm_profilo)
            WHERE username = $6;
        `;
        await db.query(updateUtenteQuery, [via, numero_Civico, CAP, citta, imm_Profilo, username]);

        if (partita_Iva) {
            const checkVenditore = await db.query(`SELECT * FROM venditore WHERE username_utente = $1;`, [username]);

            if (checkVenditore.rows.length === 0) {
                await db.query(
                    `INSERT INTO venditore (partita_iva, username_utente) VALUES ($1, $2);`,
                    [partita_Iva, username]
                );
            }
        }

        return res.status(200).json({ messaggio: "Profilo aggiornato con successo!" });

    } catch (err) {
        console.error("Errore durante l'aggiornamento:", err);
        return res.status(500).json({ errore: "Errore durante l'aggiornamento del profilo." });
    }
};

module.exports = {
    getProfilo,
    patchProfilo
};