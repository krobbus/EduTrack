const db = require('../config/db');

// class code (ED-XXXX)
async function generateUniqueClassCode() {
    let isUnique = false;
    let code = '';
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        code = `ED-${generateCode(4)}`;
        const existing = await db.query(
            'SELECT id FROM class WHERE class_code = $1',
            [code]
        );

        if (existing.rows.length === 0) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Failed to generate a unique class code. Please try again.');
    }

    return code;
}

// pass code for class (XXXXXX)
function generateCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function createClass(req, res, next) {
  try {
    const { title, description } = req.body;
    const faculty_id = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Class title is required.' });
    }

    const class_code = await generateUniqueClassCode();

    const query = `
        INSERT INTO class (class_code, title, description, faculty_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, class_code, title, description, faculty_id, created_at
    `;
    const values = [class_code, title, description || null, faculty_id];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Class created successfully.',
      class: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function getMyClasses(req, res, next) {
    try {
        const { id: userId, role } = req.user;
        let query = '';
        let values = [];

        if (role === 'faculty') {
            query = `
                SELECT c.id, c.class_code, c.title, c.description, c.created_at, COUNT(e.id)::INT AS student_count
                FROM class c
                LEFT JOIN enrollments e ON c.id = e.class_id
                WHERE c.faculty_id = $1
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `;
            values = [userId];
        } else if (role === 'student') {
            query = `
                SELECT c.id, c.class_code, c.title, c.description, c.created_at,
                    u.first_name AS faculty_first_name,
                    u.last_name AS faculty_last_name,
                    e.enrolled_at
                FROM enrollments e
                JOIN class c ON e.class_id = c.id
                JOIN users u ON c.faculty_id = u.id
                WHERE e.student_id = $1
                ORDER BY e.enrolled_at DESC
            `;
            values = [userId];
        } else if (role === 'admin') {
            query = `
                SELECT c.id, c.class_code, c.title, c.description, c.created_at,
                    u.first_name AS faculty_first_name, 
                    u.last_name AS faculty_last_name,
                    COUNT(e.id)::INT AS student_count
                FROM class c
                JOIN users u ON c.faculty_id = u.id
                LEFT JOIN enrollments e ON c.id = e.class_id
                GROUP BY c.id, u.first_name, u.last_name
                ORDER BY c.created_at DESC
            `;
            values = [];
        }
        const result = await db.query(query, values);
        return res.status(200).json({ classes: result.rows });
    } catch (err) {
        next(err);
    }
}

async function getClassById(req, res, next) {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
            c.id, c.class_code, c.title, c.description, c.created_at,
            u.id AS faculty_id, u.first_name AS faculty_first_name, u.last_name AS faculty_last_name, u.email AS faculty_email
            FROM class c
            JOIN users u ON c.faculty_id = u.id
            WHERE c.id = $1
        `;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found.' });
        }

        return res.status(200).json({ class: result.rows[0] });
    } catch (err) {
        next(err);
    }
}

// request to join class (students)
async function requestJoinClass(req, res, next) {
    try {
        const { class_code } = req.body;
        const student_id = req.user.id;

        if (!class_code) {
            return res.status(400).json({ error: 'Class code is required.' });
        }

        const classResult = await db.query(
            'SELECT id, title FROM class WHERE class_code = $1',
            [class_code.trim().toUpperCase()]
        );

        if (classResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid class code. Class not found.' });
        }

        const classId = classResult.rows[0].id;

        const enrolledCheck = await db.query(
            'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
            [classId, student_id]
        );

        if (enrolledCheck.rows.length > 0) {
            return res.status(400).json({ error: 'You are already enrolled in this class.' });
        }

        await db.query(
            `INSERT INTO pending_enrollments (class_id, student_id) 
            VALUES ($1, $2)`,
            [classId, student_id]
        );

        return res.status(201).json({
            message: `Join request sent for "${classResult.rows[0].title}". Awaiting faculty approval.`,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createClass,
    getMyClasses,
    getClassById,
    requestJoinClass,
};