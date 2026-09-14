import db from '../config/db.js';

export async function getModuleHandler(req, res, next) {
  try {
    const { id: userId, role } = req.user;
    let query = '';
    let values = [];

    if (role === 'faculty') {
      query = `
        SELECT
          m.id AS module_id, m.title AS module_title, m.description, m.created_at,
          c.id AS class_id, c.title AS class_title, c.class_code
        FROM modules m
        JOIN class c ON c.id = m.class_id
        WHERE c.faculty_id = $1
        ORDER BY m.created_at DESC
      `;
      values = [userId];
    } else if (role === 'student') {
      query = `
        SELECT
          m.id AS module_id, m.title AS module_title, m.description, m.created_at,
          c.id AS class_id, c.title AS class_title, c.class_code,
          u.first_name AS faculty_first_name, u.last_name AS faculty_last_name
        FROM modules m
        JOIN class c ON c.id = m.class_id
        JOIN enrollments e ON e.class_id = c.id
        JOIN users u ON u.id = c.faculty_id
        WHERE e.student_id = $1
        ORDER BY m.created_at DESC
      `;
      values = [userId];
    } else if (role === 'admin') {
      query = `
        SELECT
          m.id AS module_id, m.title AS module_title, m.description, m.created_by, m.created_at,
          c.id AS class_id, c.title AS class_title, c.class_code,
          u_faculty.id AS faculty_id, u_faculty.first_name AS faculty_first_name, u_faculty.last_name AS faculty_last_name,
          COUNT(u_student.id)::INT AS student_count
        FROM modules m
        JOIN class c ON c.id = m.class_id
        JOIN users u_faculty ON u_faculty.id = c.faculty_id
        LEFT JOIN enrollments e ON e.class_id = c.id
        LEFT JOIN users u_student ON u_student.id = e.student_id
        GROUP BY m.id, c.id, u_faculty.id
        ORDER BY m.created_at DESC
      `;
      values = [];
    }

    const result = await db.query(query, values);
    return res.status(200).json({
      count: result.rows.length,
      modules: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function postModuleHandler(req, res, next) {
  try {
    const { id: classId } = req.params
    const { id: userId } = req.user;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Module title and description are required.' });
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
      INSERT INTO modules (class_id, title, description, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, class_id, title, description, created_by, created_at
    `;
    const values = [classId, title.trim(), description.trim(), userId];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Module created successfully.',
      module: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function patchModuleIdHandler(req, res, next) {
  try {
    const { id: moduleId } = req.params;
    const { id: userId, role } = req.user;
    const { class_id, title, description } = req.body;

    const moduleCheck = await db.query(
      `SELECT m.id, m.created_by, c.faculty_id FROM modules m JOIN class c ON c.id = m.class_id WHERE m.id = $1
      `, [moduleId]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found.' });
    }
    const existingModule = moduleCheck.rows[0];

    if (role !== 'admin' && existingModule.created_by !== userId && existingModule.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to update this module.' });
    }

    if (class_id) {
      const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id]);
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Target class not found.' });
      }
    }

    const query = `
      UPDATE modules
      SET class_id = COALESCE($1, class_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description)
      WHERE id = $4
      RETURNING id, class_id, title, description, created_by, created_at
    `;

    const values = [
      class_id || null,
      title ? title.trim() : null,
      description ? description.trim() : null,
      id,
    ];
    const result = await db.query(query, values);

    return res.status(200).json({
      message: 'Module updated successfully.',
      module: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteModuleIdHandler(req, res, next) {
  try {
    const { id: moduleId } = req.params;
    const { id: userId, role } = req.user;

    const moduleCheck = await db.query(
      `SELECT m.id, m.created_by, c.faculty_id FROM modules m JOIN class c ON c.id = m.class_id WHERE m.id = $1
      `, [moduleId]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found.' });
    }
    const existingModule = moduleCheck.rows[0];

    if (role !== 'admin' && existingModule.created_by !== userId && existingModule.faculty_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this module.' });
    }

    await db.query('DELETE FROM module WHERE id = $1', [id]);

    return res.status(200).json({ message: 'Module deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export default {
  getModuleHandler,
  postModuleHandler,
  patchModuleIdHandler,
  deleteModuleIdHandler,
};