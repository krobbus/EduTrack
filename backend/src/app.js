import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/class', classRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/module', moduleRoutes);
app.use(errorHandler);

export default app;