import db from '../config/db.js';

export async function getNoteHandler(req, res, next) {
  try {
    const { id: userId, role } = req.user;
    const { class_id } = req.query;

    let query = '';
    let values = [];

    if (class_id) {
      query = `
        SELECT 
          n.id, n.class_id, n.user_id, n.title, n.description, n.event_date, n.created_at,
          u.first_name AS author_first_name, u.last_name AS author_last_name
        FROM notes n
        JOIN users u ON u.id = n.user_id
        WHERE n.class_id = $1 AND (n.user_id = $2 OR $3 = 'admin' OR $3 = 'faculty')
        ORDER BY n.event_date ASC
      `;
      values = [class_id, userId, role];
    } else {
      query = `
        SELECT 
          n.id, n.class_id, n.user_id, n.title, n.description, n.event_date, n.created_at,
          c.title AS class_title
        FROM notes n
        LEFT JOIN class c ON c.id = n.class_id
        WHERE n.user_id = $1 OR $2 = 'admin'
        ORDER BY n.event_date ASC
      `;
      values = [userId, role];
    }

    const result = await db.query(query, values);

    return res.status(200).json({
      count: result.rows.length,
      notes: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function postNoteHandler(req, res, next) {
  try {
    const { id: userId } = req.user;
    const { class_id, title, description, event_date } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event_date are required fields.' });
    }

    if (class_id) {
      const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id]);
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Associated class not found.' });
      }
    }

    const query = `
      INSERT INTO notes (class_id, user_id, title, description, event_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, class_id, user_id, title, description, event_date, created_at
    `;

    const values = [
      class_id || null,
      userId,
      title.trim(),
      description ? description.trim() : null,
      event_date,
    ];

    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Note created successfully.',
      note: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function patchNoteIdHandler(req, res, next) {
  try {
    const { id: noteId } = req.params;
    const { id: userId, role } = req.user;
    const { class_id, title, description, event_date } = req.body;

    const noteCheck = await db.query('SELECT * FROM notes WHERE id = $1', [noteId]);

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const existingNote = noteCheck.rows[0];

    if (role !== 'admin' && existingNote.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own notes.' });
    }

    const query = `
      UPDATE notes
      SET
        class_id = COALESCE($1, class_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        event_date = COALESCE($4, event_date)
      WHERE id = $5
      RETURNING id, class_id, user_id, title, description, event_date, created_at
    `;

    const values = [
      class_id !== undefined ? class_id : null,
      title ? title.trim() : null,
      description ? description.trim() : null,
      event_date || null,
      noteId,
    ];

    const result = await db.query(query, values);

    return res.status(200).json({
      message: 'Note updated successfully.',
      note: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteNoteIdHandler(req, res, next) {
  try {
    const { id: noteId } = req.params;
    const { id: userId, role } = req.user;

    const noteCheck = await db.query('SELECT user_id FROM notes WHERE id = $1', [noteId]);

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const existingNote = noteCheck.rows[0];

    if (role !== 'admin' && existingNote.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own notes.' });
    }

    await db.query('DELETE FROM notes WHERE id = $1', [noteId]);

    return res.status(200).json({
      message: 'Note deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getNoteHandler,
  postNoteHandler,
  patchNoteIdHandler,
  deleteNoteIdHandler,
};