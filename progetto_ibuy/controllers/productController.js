const db = require('../db');

// 1. RICERCA E VISUALIZZAZIONE CATALOGO PRODOTTI (GET /prodotti)[cite: 2, 10]
// #swagger.tags = ['Prodotti']
// #swagger.summary = 'Recupera la lista filtrata e paginata dei prodotti del catalogo'
/* #swagger.parameters['q'] = { in: 'query', description: 'Filtro testuale sul nome del prodotto', type: 'string' } */
/* #swagger.parameters['tipo'] = { in: 'query', description: 'Filtro per tipologia di prodotto', type: 'string' } */
/* #swagger.parameters['size'] = { in: 'query', description: 'Numero di elementi per pagina', type: 'integer' } */
/* #swagger.parameters['page'] = { in: 'query', description: 'Numero della pagina (partendo da 0)', type: 'integer' } */
const getProdotti = async (req, res) => {
    try {
        const { q = '', tipo = null, size = 20, page = 0 } = req.query;
        const limit = parseInt(size);
        const pageNum = parseInt(page);
        const offset = pageNum * limit;

        // Query parametrica basata sulla specifica[cite: 2, 10]
        const query = `
            SELECT * FROM prodotto 
            WHERE nome ILIKE '%' || $1 || '%' AND ($2::text IS NULL OR tipo = $2::tipoprodotto) 
            LIMIT $3 OFFSET $4;
        `;
        const result = await db.query(query, [q, tipo, limit, offset]);

        // Costruzione dinamica dei link HATEOAS per la paginazione (next / prev)[cite: 2, 10]
        const baseUrl = `/prodotti?q=${q}${tipo ? `&tipo=${tipo}` : ''}&size=${limit}`;
        const next = result.rows.length === limit ? `${baseUrl}&page=${pageNum + 1}` : null;
        const prev = pageNum > 0 ? `${baseUrl}&page=${pageNum - 1}` : null;

        const results = result.rows.map(p => ({
            codice_Prodotto: p.codice_prodotto,
            nome: p.nome,
            costo: p.costo,
            tipo: p.tipo,
            quantita: p.quantita,
            peso: p.peso,
            dimensione: p.dimensione,
            prodottoLNK: `/prodotti/${p.codice_prodotto}`
        }));

        return res.status(200).json({
            page: pageNum,
            size: limit,
            q,
            tipo: tipo || null,
            next,
            prev,
            results
        });

    } catch (err) {
        console.error("Errore nel recupero dei prodotti:", err);
        return res.status(500).json({ errore: "Errore interno del server nel recupero dei prodotti." });
    }
};

// 2. PUBBLICAZIONE NUOVO PRODOTTO (POST /prodotti)[cite: 2, 10]
// #swagger.tags = ['Prodotti']
// #swagger.summary = 'Pubblica un nuovo prodotto nel catalogo (riservato ai venditori)'
/* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Dati per la creazione di un nuovo prodotto',
    required: true,
    schema: {
        nome: 'Smartphone iBuy',
        costo: 499.99,
        descrizione: 'Smartphone di ultima generazione',
        tipo: 'Fisico',
        quantita: 10,
        peso: 0.2,
        dimensione: '15x7 cm'
    }
} */
const creaProdotto = async (req, res) => {
    try {
        const username = req.user.username;
        const { nome, costo, descrizione, tipo, quantita, peso, dimensione } = req.body;

        if (!nome || !costo || !descrizione || !tipo) {
            return res.status(400).json({ errore: "Campi obbligatori mancanti: nome, costo, descrizione, tipo." });
        }

        // Verifica che l'utente sia un venditore registrato (controllo Partita IVA)[cite: 2, 10]
        const venditore = await db.query(`SELECT partita_iva FROM venditore WHERE username_utente = $1;`, [username]);

        if (venditore.rows.length === 0) {
            return res.status(403).json({ errore: "Accesso negato: solo i venditori registrati possono inserire prodotti." });
        }

        const partitaIvaVenditore = venditore.rows[0].partita_iva;

        // Gestione opzionale dell'immagine (file upload o percorso testuale)
        let immaginePath = null;
        if (req.files && req.files.immagine) {
            const file = req.files.immagine;
            immaginePath = `${Date.now()}_${file.name}`;
            file.mv(`resources/${immaginePath}`);
        } else if (req.body.immagine) {
            immaginePath = req.body.immagine;
        }

        const query = `
            INSERT INTO prodotto (nome, costo, descrizione, tipo, quantita, immagine, peso, dimensione, partita_iva_venditore) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING codice_prodotto;
        `;

        const result = await db.query(query, [
            nome,
            costo,
            descrizione,
            tipo,
            quantita !== undefined ? quantita : null,
            immaginePath,
            peso !== undefined ? peso : null,
            dimensione !== undefined ? dimensione : null,
            partitaIvaVenditore
        ]);

        const codiceProdotto = result.rows[0].codice_prodotto;

        return res.status(201).json({
            codice_Prodotto: codiceProdotto,
            prodottoLNK: `/prodotti/${codiceProdotto}`
        });

    } catch (err) {
        console.error("Errore durante la creazione del prodotto:", err);
        return res.status(500).json({ errore: "Errore interno del server durante la creazione del prodotto." });
    }
};

// 3. VISUALIZZAZIONE DETTAGLIO SINGOLO PRODOTTO (GET /prodotti/:id)[cite: 10]
// #swagger.tags = ['Prodotti']
// #swagger.summary = 'Recupera i dettagli di uno specifico prodotto tramite ID'
const getProdottoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT * FROM prodotto WHERE codice_prodotto = $1;`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ errore: "Prodotto non trovato." });
        }

        const p = result.rows[0];
        return res.status(200).json({
            ...p,
            prodottoLNK: `/prodotti/${p.codice_prodotto}`
        });

    } catch (err) {
        console.error("Errore nel recupero del singolo prodotto:", err);
        return res.status(500).json({ errore: "Errore interno del server." });
    }
};

module.exports = {
    getProdotti,
    creaProdotto,
    getProdottoById
};