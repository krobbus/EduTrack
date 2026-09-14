import db from '../config/db.js';

export async function getMeetingHandler(req, res, next) {
  try {
    const { id: classId } = req.params;
    const { id: userId, role } = req.user;

    if (!classId) {
      return res.status(400).json({ error: 'class ID is required.' });
    }

    const classCheck = await db.query('SELECT id, faculty_id FROM class WHERE id = $1', [classId]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    const classData = classCheck.rows[0];

    if (role === 'faculty' && classData.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not teach this class.' });
    }

    if (role === 'student') {
      const enrollmentCheck = await db.query(
        'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, userId]
      );

      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You are not enrolled in this class.' });
      }
    }

    const query = `
      SELECT
        me.id AS meeting_id, me.type, me.location, me.meeting_url, me.title, me.description, me.start_date, me.end_date, me.created_by, me.created_at,
        mo.id AS module_id, mo.title AS module_title,
        c.id AS class_id, c.title AS class_title, c.faculty_id
      FROM meetings me
      JOIN modules mo ON mo.id = me.module_id
      JOIN class c ON c.id = me.class_id
      WHERE c.id = $1
      ORDER BY me.start_date DESC
    `;

    const result = await db.query(query, [classId]);

    return res.status(200).json({
      count: result.rows.length,
      meetings: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function postMeetingHandler(req, res, next) {
  try {
    const { id: classId } = req.params
    const { id: userId, role } = req.user;
    const { type, location, meeting_url, title, description, start_date, end_date, module_id } = req.body;

    if (!module_id || !type || !location || !meeting_url || !title || !description || !start_date || !end_date) {
      return res.status(400).json({ error: 'Fill all required fields.' });
    }

    if (!classId) {
      return res.status(400).json({ error: 'class ID is required.' });
    }

    const classCheck = await db.query('SELECT id, faculty_id FROM class WHERE id = $1', [classId]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    const classData = classCheck.rows[0];

    if (role === 'faculty' && classData.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not teach this class.' });
    }

    if (role === 'student') {
      const enrollmentCheck = await db.query(
        'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, userId]
      );

      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You are not enrolled in this class.' });
      }
    }

    const query = `
      INSERT INTO meetings (class_id, module_id, type, location, meeting_url, title, description, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, class_id, module_id, type, location, meeting_url, title, description, start_date, end_date, created_by, created_at
    `;

    const values = [classId, module_id, type, location, meeting_url, title.trim(), description.trim(), start_date, end_date, userId];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Meeting created successfully.',
      meeting: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function patchMeetingIdHandler(req, res, next) {
  try {
    const { id: meetingId } = req.params;
    const { id: userId, role } = req.user;
    const { type, location, meeting_url, title, description, start_date, end_date } = req.body;

    const meetingCheck = await db.query(
      `
        SELECT m.id, c.faculty_id
        FROM meetings m
        JOIN class c ON c.id = m.class_id
        WHERE m.id = $1
      `,
      [meetingId]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }
    const existingMeeting = meetingCheck.rows[0];

    if (role !== 'admin' && existingMeeting.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to update this meeting.' });
    }

    const query = `
      UPDATE meetings
      SET
        type = COALESCE($1, type),
        location = COALESCE($2, location),
        meeting_url = COALESCE($3, meeting_url),
        title = COALESCE($4, title),
        description = COALESCE($5, description),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date)
      WHERE id = $8
      RETURNING id, type, location, meeting_url, title, description, start_date, end_date, created_by, created_at
    `;
    const values = [type, location, meeting_url, title ? title.trim() : null, description ? description.trim() : null, start_date, end_date, meetingId];
    const result = await db.query(query, values);

    return res.status(200).json({
      message: 'Meeting updated successfully.',
      meeting: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMeetingIdHandler(req, res, next) {
  try {
    const { id: meetingId } = req.params;
    const { id: userId, role } = req.user;

    const meetingCheck = await db.query(
      `
        SELECT m.id, c.faculty_id
        FROM meetings m
        JOIN class c ON c.id = m.class_id
        WHERE m.id = $1
      `,
      [meetingId]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }
    const existingMeeting = meetingCheck.rows[0];

    if (role !== 'admin' && existingMeeting.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this meeting.' });
    }

    await db.query('DELETE FROM meeting WHERE id = $1', [meetingId]);

    return res.status(200).json({ message: 'Meeting deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export default {
  getMeetingHandler,
  postMeetingHandler,
  patchMeetingIdHandler,
  deleteMeetingIdHandler,
};