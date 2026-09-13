import db from '../config/db.js';

export async function classCheckHandler(req, res, next) {
    try {
        const classId = req.params.class_id || req.body.class_id || req.query.class_id;
        const { id: userId, role } = req.user;

        if (!classId) {
            return res.status(400).json({ error: 'class_id is required.' });
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

        req.classId = classId;
        req.classData = classData;
        next();
    } catch (err) {
        next(err);
    }
}

export default classCheckHandler;