import db from '../config/db.js';

export async function getAttendanceHandler(req, res, next) {
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

    let query = `
      SELECT
        a.id, a.class_id, a.student_id, a.date, a.status,
        u.first_name AS student_first_name, u.last_name AS student_last_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.class_id = $1
    `;
    let values = [classId];

    if (role === 'student') {
      query += ` AND a.student_id = $2`;
      values.push(userId);
    }

    query += ` ORDER BY a.date DESC, u.first_name ASC, u.last_name ASC`;

    const result = await db.query(query, values);
    return res.status(200).json({
      count: result.rows.length,
      attendance: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createAttendanceHandler(req, res, next) {
  try {
    const { id: classId } = req.params;
    const { id: userId, role } = req.user;
    const { student_id, date, status } = req.body;

    if (!student_id || !date || !status) {
      return res.status(400).json({ error: 'Fill up all required fields.' });
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
      INSERT INTO attendance (class_id, student_id, date, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (class_id, student_id, date)
      DO UPDATE SET status = EXCLUDED.status
      RETURNING id, class_id, student_id, date, status;
    `;

    const values = [classId, student_id, date, status];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Attendance created successfully.',
      attendance: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAttendanceHandler(req, res, next) {
  try {
    const { id: attendanceId, id: classId } = req.params;
    const { id: userId, role } = req.user;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
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
      UPDATE attendance
      SET status = $1
      WHERE id = $2 AND class_id = $3
      RETURNING id, class_id, student_id, date, status;
    `;
    const values = [status, attendanceId, classId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    return res.status(200).json({
      message: 'Attendance updated successfully.',
      attendance: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttendanceHandler(req, res, next) {
  try {
    const { id: attendanceId, id: classId } = req.params;
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

    const result = await db.query(
      'DELETE FROM attendance WHERE id = $1 AND class_id = $2 RETURNING id',
      [attendanceId, classId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    return res.status(200).json({ message: 'Attendance deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export default {
  getAttendanceHandler,
  createAttendanceHandler,
  updateAttendanceHandler,
  deleteAttendanceHandler,
};