const express = require('express');
const app = express();

const classRoutes = require('./routes/classRoutes'); 

app.use(express.json());

app.use('/api/class', classRoutes);

module.exports = app;