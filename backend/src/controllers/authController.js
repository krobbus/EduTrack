import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function registerHandler(req, res, next) {
  try {
    const { email, password, first_name, middle_name, last_name, role } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Please provide all informations.' });
    }

    const userRole = role && ['student', 'faculty'].includes(role) ? role : 'student';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (email, password_hash, first_name, middle_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, role, email, first_name, middle_name, last_name, created_at
    `;
    const values = [
      email.toLowerCase().trim(),
      password_hash,
      first_name,
      middle_name || null,
      last_name,
      userRole,
    ];
    const result = await db.query(query, values);
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    delete user.password_hash;

    return res.status(201).json({ message: 'Registration successful.', token, user });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const query = `
      SELECT id, role, email, password_hash, first_name, middle_name, last_name
      FROM users
      WHERE email = $1
    `;
    const result = await db.query(query, [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    delete user.password_hash;

    return res.status(200).json({ message: 'Login successful.', token, user });
  } catch (err) {
    next(err);
  }
}

export default { registerHandler, loginHandler };