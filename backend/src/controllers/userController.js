import db from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function getUserHandler(req, res, next) {
  try {
    const query = `
      SELECT id, email, first_name, middle_name, last_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);

    return res.status(200).json({
      count: result.rows.length,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function postUserHandler(req, res, next) {
  try {
    const { email, password, role, first_name, middle_name, last_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const assignedRole = (req.user && req.user.role === 'admin' && role) ? role : 'user';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, role, first_name, middle_name, last_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, role, first_name, middle_name, last_name, created_at
    `;
    const values = [
      normalizedEmail,
      passwordHash,
      assignedRole,
      first_name || null,
      middle_name || null,
      last_name || null,
    ];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'User successfully created.',
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    if (role !== 'admin' && parseInt(id, 10) !== userId) {
      return res.status(403).json({
        error: 'Forbidden: You can only view your own profile.'
      });
    }

    const query = `
      SELECT id, email, first_name, middle_name, last_name, role, created_at
      FROM users
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function patchUserIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId, role: requesterRole } = req.user;
    const { email, password, role: bodyRole, first_name, middle_name, last_name } = req.body;

    if (requesterRole !== 'admin' && parseInt(id, 10) !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own profile.' });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    let passwordHash = null;
    if (password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const newRole = requesterRole === 'admin' && bodyRole ? bodyRole : null;

    const query = `
      UPDATE users SET
        email = COALESCE($1, email),
        password_hash = COALESCE($2, password_hash),
        role = COALESCE($3, role),
        first_name = COALESCE($4, first_name),
        middle_name = COALESCE($5, middle_name),
        last_name = COALESCE($6, last_name)
      WHERE id = $7
      RETURNING id, email, role, first_name, middle_name, last_name, created_at
    `;

    const values = [
      normalizedEmail,
      passwordHash,
      newRole,
      first_name || null,
      middle_name || null,
      last_name || null,
      id,
    ];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      message: 'Successfully updated profile.',
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    if (parseInt(id, 10) === userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const query = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ message: 'Successfully deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { id: adminId, role } = req.user;
    const { new_password } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can reset user passwords.' });
    }

    if (parseInt(id, 10) === adminId) {
      return res.status(400).json({ error: 'You cannot use reset-password on your own account.' });
    }

    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({ error: 'New password is required and must be at least 6 characters long.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password.trim(), saltRounds);

    const query = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      RETURNING id, email, role, first_name, last_name
    `;
    const result = await db.query(query, [passwordHash, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      message: 'Password successfully reset.',
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getUserHandler,
  postUserHandler,
  getUserIdHandler,
  patchUserIdHandler,
  deleteUserIdHandler,
  resetPasswordHandler,
};