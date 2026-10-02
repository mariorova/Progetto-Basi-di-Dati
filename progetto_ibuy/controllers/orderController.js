const db = require('../db');

// 1. CREAZIONE DI UN NUOVO ACQUISTO CON CONTROLLO INDIRIZZO PER PRODOTTI FISICI
// #swagger.tags = ['Ordini']
// #swagger.summary = 'Crea un nuovo acquisto verificando scorte e indirizzo per beni fisici'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Codice del prodotto da acquistare',
    required: true,
    schema: {
        codice_Prodotto: 1
    }
} */
const creaAcquisto = async (req, res) => {
    try {
        const usernameAcquirente = req.user.username;
        const { codice_Prodotto } = req.body; // Allineato al nome nella specifica[cite: 9]

        // 1. Verifica esistenza prodotto
        const prodotto = await db.query(`SELECT * FROM prodotto WHERE codice_prodotto = $1;`, [codice_Prodotto]);

        if (prodotto.rows.length === 0) {
            return res.status(404).json({ errore: "Prodotto non trovato." });
        }

        const prod = prodotto.rows[0];

        // 2. Controllo disponibilità quantità (se gestita)
        if (prod.quantita !== null && prod.quantita <= 0) {
            return res.status(409).json({ errore: "Prodotto esaurito." });
        }

        // 3. Se il prodotto è 'Fisico', verifica che l'utente abbia un indirizzo salvato nel profilo
        if (prod.tipo === 'Fisico') {
            const utente = await db.query(`SELECT via, citta FROM utente WHERE username = $1;`, [usernameAcquirente]);
            if (utente.rows.length === 0 || !utente.rows[0].via || !utente.rows[0].citta) {
                return res.status(403).json({ errore: "Per acquistare prodotti fisici è necessario inserire un indirizzo nel profilo." });
            }
        }

        // 4. Calcolo del costo finale (costo base del prodotto)
        const costoTotale = Number(prod.costo);

        // 5. Inserimento nella tabella acquisto
        const query = `
            INSERT INTO acquisto (timestamp, costo, username_utente, codice_prodotto) 
            VALUES (DEFAULT, $1, $2, $3) 
            RETURNING codice_acquisto, timestamp;
        `;
        const resultAcquisto = await db.query(query, [costoTotale, usernameAcquirente, codice_Prodotto]);
        const nuovoAcquisto = resultAcquisto.rows[0];

        // 6. Aggiornamento giacenza prodotto (se la quantità non è NULL)
        if (prod.quantita !== null) {
            await db.query(`UPDATE prodotto SET quantita = quantita - 1 WHERE codice_prodotto = $1;`, [codice_Prodotto]);
        }

        return res.status(201).json({
            codice_Acquisto: nuovoAcquisto.codice_acquisto,
            timestamp: nuovoAcquisto.timestamp,
            costo: nuovoAcquisto.costo,
            prodottoLNK: `/prodotti/${codice_Prodotto}`
        });

    } catch (err) {
        console.error("Errore durante l'acquisto:", err);
        return res.status(500).json({ errore: "Errore interno del server durante l'acquisto." });
    }
};

// 2. VISUALIZZAZIONE ACQUISTI
// #swagger.tags = ['Ordini']
// #swagger.summary = 'Recupera la lista degli acquisti effettuati o ricevuti'
const getAcquisti = async (req, res) => {
    try {
        const username = req.user.username;

        // Controlliamo se è un venditore
        const venditore = await db.query(`SELECT * FROM venditore WHERE username_utente = $1;`, [username]);

        let query;
        let params;

        if (venditore.rows.length > 0) {
            // Se è venditore, vede gli acquisti sui suoi prodotti
            query = `SELECT a.* FROM acquisto a JOIN prodotto p ON a.codice_prodotto = p.codice_prodotto WHERE p.partita_iva_venditore = $1;`;
            params = [venditore.rows[0].partita_iva];
        } else {
            // Se è acquirente, vede i suoi acquisti
            query = `SELECT * FROM acquisto WHERE username_utente = $1;`;
            params = [username];
        }

        const result = await db.query(query, params);
        return res.status(200).json({ acquisti: result.rows });

    } catch (err) {
        console.error("Errore nel recupero acquisti:", err);
        return res.status(500).json({ errore: "Errore nel recupero degli acquisti." });
    }
};

module.exports = { creaAcquisto, getAcquisti };