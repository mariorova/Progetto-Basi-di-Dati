const { Pool } = require('pg');
require('dotenv').config();

// Creiamo il "pool" di connessione usando i dati protetti del file .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Gestione di eventuali errori improvvisi del database
pool.on('error', (err, client) => {
    console.error('Errore inatteso sul client del database', err);
    process.exit(-1);
});

// Esportiamo il pool per poterlo usare in tutto il resto del server
module.exports = pool;