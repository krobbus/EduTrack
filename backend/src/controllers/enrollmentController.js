const db = require('../config/db');

async function getEnrollmentHandler(req, res, next){
    try{
        const { id: userId, role } = req.user;
        let query = '';
        values= [];

        if (role === 'faculty') {
            query = `
                SELECT
                e.id AS enrollment_id, e.enrolled_at,
                c.id AS class_id, c.title AS class_title, c.class_code,
                u.id AS student_id, u.first_name AS student_first_name, u.last_name AS student_last_name, u.email AS student_email
                FROM enrollments e
                JOIN class c ON c.id = e.class_id
                JOIN users u ON u.id = e.student_id
                WHERE c.faculty_id = $1
                ORDER BY e.enrolled_at DESC
            `;
            values = [userId];
        } else if (role === 'student') {
            query = `
                SELECT 
                e.id AS enrollment_id, e.enrolled_at,
                c.id AS class_id, c.title AS class_title, c.class_code,
                u.first_name AS faculty_first_name, u.last_name AS faculty_last_name
                FROM enrollments e
                JOIN class c ON c.id = e.class_id
                JOIN users u ON u.id = c.faculty_id
                WHERE e.student_id = $1
                ORDER BY e.enrolled_at DESC
            `;
            values = [userId];
        } else if (role === 'admin') {
            query = `
                SELECT 
                e.id AS enrollment_id, e.enrolled_at,
                c.title AS class_title, c.class_code,
                u_student.first_name AS student_first_name, u_student.last_name AS student_last_name, u_faculty.first_name AS faculty_first_name, u_faculty.last_name AS faculty_last_name
                FROM enrollments e
                JOIN class c ON c.id = e.class_id
                JOIN users u_student ON u_student.id = e.student_id
                JOIN users u_faculty ON u_faculty.id = c.faculty_id
                ORDER BY e.enrolled_at DESC
            `;
            values = [];
        }

        const result = await db.query(query, values);
        return res.status(200).json({
            count: result.rows.length,
            enrollments: result.rows,
        });
    } catch(err){
        next(err)
    }
}

async function postEnrollmentHandler(req, res, next) {
    try{
        const { student_id } = req.user.id;
        const { class_id } = req.body;

        if (!class_id) {
            return res.status(400).json({ error: 'class ID is required.' });
        }

        const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id]);
        if (classCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found.' });
        }

        const existingEnrollment = await db.query(
            'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
            [class_id, student_id]
        );
        if (existingEnrollment.rows.length > 0) {
            return res.status(409).json({ error: 'You are already enrolled in this class.' });
        }

        const query = `
            INSERT INTO enrollments (class_id, student_id)
            VALUES ($1, $2)
            RETURNING id, class_id, student_id, enrolled_at
        `
        const result = await db.query(query, [class_id, student_id]);

        return res.status(201).json({
            message: "Successfully Enrolled",
            enrollments: result.rows[0],
        })
    } catch(err){
        next(err)
    }
}

async function patchEnrollmentIdHandler(req, res, next) {
    try {
        const student_id = req.user.id;
        const { class_id } = req.body;

        if (!class_id) {
            return res.status(400).json({ error: 'class_id is required.' });
        }

        const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id]);
        if (classCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found.' });
        }

        const existingEnrollment = await db.query(
            'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
            [class_id, student_id]
        );
        if (existingEnrollment.rows.length > 0) {
            return res.status(409).json({ error: 'You are already enrolled in this class.' });
        }

        const insertQuery = `
            INSERT INTO enrollments (class_id, student_id)
            VALUES ($1, $2)
            RETURNING id, class_id, student_id, enrolled_at
        `;
        const result = await db.query(insertQuery, [class_id, student_id]);

        return res.status(201).json({
            message: 'Successfully Enrolled',
            enrollment: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
}

async function deleteEnrollmentIdHandler(req, res, next) {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;

        const checkEnrollment = await db.query(`
                SELECT e.id, e.student_id, c.faculty_id 
                FROM enrollments e 
                JOIN class c ON c.id = e.class_id 
                WHERE e.id = $1
            `,
            [id]
        );
        if (checkEnrollment.rows.length === 0) {
            return res.status(404).json({ error: 'Enrollment record not found.' });
        }
        const record = checkEnrollment.rows[0];

        if (role === 'student' && record.student_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: You can only drop your own enrollments.' });
        }
        if (role === 'faculty' && record.faculty_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: You can only drop students from your own classes.' });
        }

        await db.query('DELETE FROM enrollments WHERE id = $1', [id]);

        return res.status(200).json({
            message: 'Successfully removed enrollment record.',
        });
    } catch (err) {
        next(err);
    }
}


module.exports = {
    getEnrollmentHandler,
    postEnrollmentHandler,
    patchEnrollmentIdHandler,
    deleteEnrollmentIdHandler,
};