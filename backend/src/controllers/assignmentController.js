import db from '../config/db.js'

export async function getAssignmentHandler(req, res, next){
    try{
        const {id: userId, role } = req.user
        const { class_id } = req.params

        const classCheck = await db.query(`SELECT faculty_id FROM class WHERE id = $1`, [class_id])
        if(classCheck.rows.length === 0){
            return res.status(404).json({ error: "Class not found." })
        }
        const classData = classCheck.rows[0]

        if (role === 'faculty' && classData.faculty_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not teach this class.' });
        }

        if (role === 'student') {
            const enrollmentCheck = await db.query(
                'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
                [class_id, userId]
            );

            if (enrollmentCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Forbidden: You are not enrolled in this class.' });
            }
        }

        const query = `
            SELECT
                a.class_id, a.module_id, a.title AS assignment_title, a.description AS assignment_description, a.due_date, a_max_points, a.created_at,
                m.id, m.title AS module_title,
                c.id, c.class_code, c.title AS class_title
            FROM assignment a
            JOIN module m ON m.id = a.module_id
            JOIN class c ON c.id = a.class_id
            WHERE c.id = $1
            ORDER BY m.due_date DESC
        `;
        const result = db.query(query, [class_id])

        return res.status(200).json({
            count: result.rows.length,
            assignments: result.rows,
        });
    } catch(err){
        next(err)
    }
}

export async function postAssignmentHandler(req, res, next){
    try{
        const { id: userId, role } = req.user
        const { class_id, module_id, title, description, due_date, max_points } = req.body

        if(!class_id || !module_id || !title || !description || !due_date || !max_points){
            return res.status(400).json({ error: 'Fill all required fields.' })
        }

        const classCheck = await db.query(`SELECT faculty_id FROM class WHERE id = $1`, [class_id])
        if(classCheck.rows.length === 0){
            return res.status(404).json({ error: "Class not found." })
        }
        const classData = classCheck.rows[0]

        if(role !== 'admin' && classData.faculty_id !== userId){
            return res.status(403).json({ error: "Forbidden: You're not authorized to post an assigment."})
        }

        const query = `
            INSERT INTO assignment (class_id, module_id, title, description, due_date, max_points, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, class_id, module_id, title, description, due_date, max_points, created_by, created_at
        `;
        const values = [class_id, module_id, title, description, due_date, max_points, created_by, userId]
        const result = await db.query(query, values)

        return res.status(200).json({
            message: 'Assignment created successfully',
            assignments: result.rows[0]
        })
    } catch(err){
        next(err)
    }
}

export async function patchAssignmentIdHandler(req, res, next){
    try{
        const { id: assignmentId } = req.params
        const { id: userId, role } = req.user
        const { class_id, module_id, title, description, due_date, max_points } = req.body

        const assignmentCheck = await db.query(
            `
                SELECT a.*, c.faculty_id 
                FROM assignment a 
                JOIN class c ON c.id = a.class_id 
                WHERE a.id = $1
            `, [assignmentId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found.' });
        }
        const existingAssignment = assignmentCheck.rows[0];

        if(role !== 'admin' && existingAssignment.faculty_id !== userId){
            return res.status(403).json({ error: "Forbidden: You're not authorized to update this assigment."})
        }

        const query = `
            UPDATE assignment 
            SET
              class_id = COALESCE($1, class_id), 
              module_id = COALESCE($2, module_id), 
              title = COALESCE($3, title),
              description = COALESCE($4, description),
              due_date = COALESCE($5, due_date),
              max_points = COALESCE($6, max_points)
            WHERE id = $7
            RETURNING id, class_id, module_id, title, description, due_date, max_points, created_by, created_at
        `;

        const values = [
            class_id || null,
            module_id || null,
            title,
            description,
            due_date || null,
            max_points || null,
            assignmentId,
        ];
        const result = await db.query(query, values)
        return res.status(200).json({
            message: 'Assignment updated successfully',
            assignments: result.rows[0]
        })
    } catch(err){
        next(err)
    }
}

export async function deleteAssignmentIdHandler(){
    try{
        const { id: assignmentId } = req.params
        const { id: userId, role } = req.user

        const assignmentCheck = await db.query(`SELECT a.*, c.faculty_id FROM assignment a JOIN class c ON c.id = a.class_id WHERE a.id = $1`, [assignmentId])
        if(assignmentCheck.rows.length === 0){
            return res.status(404).json({ error: 'Class not found.' })
        }
        const existingAssignment = assignmentCheck.rows[0]

        if(role !== 'admin' && existingAssignment.faculty_id !== userId){
            return res.status(403).json({ error: "Forbidden: You're not authorized to delete this assignment."})
        }

        await db.query(`DELETE id FROM assignment WHERE id = $1`, [assignmentId])
        return res.status(200).json({
            message: 'Assignment was deleted successfully'
        })
    } catch(err){
        next(err)
    }
}

export default{
    getAssignmentHandler,
    postAssignmentHandler,
    patchAssignmentIdHandler,
    deleteAssignmentIdHandler
}