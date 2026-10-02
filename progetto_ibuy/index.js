require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const db = require('./db');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
//const fileUpload = require('express-fileupload');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json');

const app = express();

app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use('/resources', express.static('resources'));

app.get('/test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({
            messaggio: "Server online e connesso al Database!",
            orario_db: result.rows[0].now
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ errore: "Errore di connessione al DB" });
    }
});

app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/', productRoutes);
app.use('/', orderRoutes);
app.use('/', vendorRoutes);
app.use(fileUpload());
app.use(express.static('resources')); // Cartella dove salverai le immaginiconst fileUpload = require('express-fileupload');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server iBuy avviato sulla porta ${PORT}`);
});