require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const routes = require('./routes/routes');

const app = express();

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());

mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        conn.connection.on('connected', () => {
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            // Start the server after successful database connection
            app.listen(PORT, () => {
                console.log("Listening for requests");
            });
        });

        conn.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send({ connection: 'Connected' });
});

// Connect to the database
connectDB();
