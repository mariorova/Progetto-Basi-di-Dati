const swaggerAutogen = require('swagger-autogen')();
//http://localhost:3000/api-docs

const doc = {
    info: {
        title: 'iBuy API',
        description: 'Documentazione delle API REST per il progetto d esame iBuy',
        version: '1.0.1'
    },
    host: 'localhost:3000',
    schemes: ['http'],
};

const outputFile = './swagger_output.json';
// Inserisci i percorsi a tutti i file delle tue rotte
const endpointsFiles = [
    './routes/authRoutes.js',
    './routes/productRoutes.js',
    './routes/orderRoutes.js',
    './routes/vendorRoutes.js'
];

// Genera il file JSON di configurazione Swagger
swaggerAutogen(outputFile, endpointsFiles, doc);