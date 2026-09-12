import db from '../config/db.js'

export async function getSubmissionHandler(req, res, next){
    try{
        const { id: assignmentId } = req.params
        const { id: userId, role } = req.user
        let query = '';
        let values = [];

        const assignmentCheck = await db.query(
            `
                SELECT a.id, a.class_id, c.faculty_id 
                FROM assignment a 
                JOIN class c ON c.id = a.class_id 
                WHERE a.id = $1
            `, [assignmentId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found.' });
        }
        const existingAssignment = assignmentCheck.rows[0];

        if(role === 'faculty'){
            if (existingAssignment.faculty_id !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not teach this class.' });
            }

            query = `
                SELECT 
                  s.submission_text, s.file_url, s.grade, s.feedback, s.status, s.submitted_at, s.graded_at, s.graded_by,
                  a.id AS assignment_id, a.class_id, a.module_id, a.title AS assignment_title, a.description AS assignment_description, a.due_date, a.max_points, a.created_by, a.created_at,
                  u.id AS student_id, u.first_name AS student_first_name, u.last_name AS student_last_name, u.email AS student_email
                FROM submission s
                JOIN assignment a ON a.id = s.assignment_id
                JOIN users u ON u.id = s.student_id
                WHERE a.id = $1
                ORDER BY s.submitted_at DESC
            `; values = [assignmentId]
        } else if (role === 'student'){
            query = `
                SELECT 
                  s.submission_text, s.file_url, s.grade, s.feedback, s.status, s.submitted_at, s.graded_at, s.graded_by,
                  a.id AS assignment_id, a.class_id, a.module_id, a.title AS assignment_title, a.description AS assignment_description, a.due_date, a.max_points, a.created_by, a.created_at
                FROM submission s
                JOIN assignment a ON a.id = s.assignment_id
                WHERE a.id = $1 AND s.student_id = $2
                ORDER BY s.submitted_at DESC
            `; values = [assignmentId, userId]
        } else if (role === 'admin') {
            query = `
                SELECT 
                  s.id AS submission_id, s.submission_text, s.file_url, s.grade, 
                  s.feedback, s.status, s.submitted_at, s.graded_at, s.graded_by,
                  a.id AS assignment_id, a.title AS assignment_title, a.max_points,
                  u.id AS student_id, u.first_name AS student_first_name, u.last_name AS student_last_name, u.email AS student_email
                FROM submission s
                JOIN assignment a ON a.id = s.assignment_id
                JOIN users u ON u.id = s.student_id
                WHERE a.id = $1
                ORDER BY s.submitted_at DESC
            `;
            values = [assignmentId];
        }

        const result = await db.query(query, values)
        return res.status(201).json({
            message: 'Submitted successfully',
            submissions: result.rows[0]
        })
    } catch(err){
        next(err)
    }
}

export async function postSubmissionHandler(req, res, next){
    try{
        const { id: assignmentId } = req.params
        const { id: userId } = req.user
        const { submission_text, file_url } = req.body

        const assignmentCheck = await db.query(
            `
                SELECT a.id, a.class_id 
                FROM assignment a 
                JOIN enrollments e ON e.class_id = a.class_id 
                WHERE a.id = $1 AND e.student_id = $2
            `, [assignmentId, userId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Assignment not found or you are not enrolled in this class.',
            });
        }

        const query = `
            INSERT INTO submission (assignment_id, student_id, submission_text, file_url, status, submitted_at)
            VALUES ($1, $2, $3, $4, 'submitted', NOW())
            ON CONFLICT (assignment_id, student_id) 
            DO UPDATE SET 
                submission_text = EXCLUDED.submission_text,
                file_url = EXCLUDED.file_url,
                submitted_at = NOW(),
                status = 'submitted'
            RETURNING id, assignment_id, student_id, submission_text, file_url, status, submitted_at
        `;
        const values = [assignmentId, userId, submission_text || null, file_url || null];
        const result = await db.query(query, values);

        return res.status(201).json({
            message: 'Assignment submitted successfully.',
            submission: result.rows[0],
        });
    } catch(err){
        next(err)
    }
}

export async function patchSubmissionIdHandler(req, res, next) {
    try {
        const { id: submissionId } = req.params;
        const { id: userId, role } = req.user;
        const { grade, feedback, status } = req.body;

        if (grade === undefined || grade === null) {
            return res.status(400).json({ error: 'Grade is required.' });
        }

        if (grade < 0) {
            return res.status(400).json({ error: 'Grade must be 0 or greater.' });
        }

        const submissionCheck = await db.query(
            `
                SELECT s.id, c.faculty_id 
                FROM submission s
                JOIN assignment a ON a.id = s.assignment_id
                JOIN class c ON c.id = a.class_id
                WHERE s.id = $1
            `, [submissionId]
        );

        if (submissionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        const submission = submissionCheck.rows[0];

        if (role !== 'admin' && submission.faculty_id !== userId) {
            return res.status(403).json({
                error: 'Forbidden: You do not have permission to grade this submission.',
            });
        }

        const query = `
            UPDATE submission
            SET 
              grade = $1,
              feedback = COALESCE($2, feedback),
              status = $3,
              graded_at = NOW(),
              graded_by = $4
            WHERE id = $5
            RETURNING id, assignment_id, student_id, grade, feedback, status, submitted_at, graded_at, graded_by;
        `;

        const values = [grade, feedback || null, status || 'graded', userId, submissionId];
        const result = await db.query(query, values);

        return res.status(200).json({
            message: 'Submission graded successfully.',
            submission: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
}

export async function deleteSubmissionIdHandler(req, res, next){
    try{
        const { id: submissionId } = req.params;
        const { id: userId, role } = req.user;

        const submissionCheck = await db.query(
            `
                SELECT s.id, c.faculty_id 
                FROM submission s
                JOIN assignment a ON a.id = s.assignment_id
                JOIN class c ON c.id = a.class_id
                WHERE s.id = $1
            `, [submissionId]
        );

        if (submissionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        const submission = submissionCheck.rows[0];

        if (role !== 'admin' && submission.faculty_id !== userId) {
            return res.status(403).json({
                error: 'Forbidden: You do not have permission to delete this submission.',
            });
        }

        await db.query(`DELETE FROM submission WHERE id = $1`, [submissionId])
        return res.status(200).json({
            message: 'Submitted was deleted successfully'
        })
    } catch(err){
        next(err)
    }
}

export default{
    getSubmissionHandler,
    postSubmissionHandler,
    patchSubmissionIdHandler,
    deleteSubmissionIdHandler
}