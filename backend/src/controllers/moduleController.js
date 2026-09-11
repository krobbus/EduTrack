import db from '../config/db.js';

export async function getModuleHandler(req, res, next){
    try{
        const { id: userId, role } = req.user
        let query = ''
        let values = []

        if(role === 'faculty'){
            query = `
                SELECT 
                  m.title as module_title, m.description, m.created_at,
                  c.class_id, c.title as class_title, c.class_code,
                FROM module m
                JOIN class c ON c.id = m.class_id
                WHERE c.faculty_id = $1
                ORDER BY m.created_at DESC
            `;
            values=[userId]
        } else if(role === 'student'){
            query = `
                SELECT
                  m.id AS module_id, m.title as module_title, m.description, m.created_at,
                  c.class_id, c.title as class_title, c.class_code,
                  u.first_name AS faculty_first_name, u.last_name AS faculty_last_name
                FROM module m
                JOIN class c ON c.id = m.class_id
                JOIN enrollments e ON e.class_id = c.id
                JOIN users u ON u.id = c.faculty_id
                WHERE e.student_id = $1
                ORDER BY m.created_at DESC
            `;
            values=[userId]
        } else if(role === 'admin') {
            query = `
                SELECT
                  m.title as module_title, m.description, m.created_by, m.created_at,
                  c.class_id, c.title as class_title, c.class_code,
                  u_student.id AS student_id, u_student.first_name AS student_first_name, u_student.last_name AS student_last_name, u_student.email AS student_email,
                  u_faculty.id AS faculty_id, u_faculty.first_name AS faculty_first_name, u_faculty.last_name AS faculty_last_name
                FROM module m
                JOIN class c ON c.id = m.class_id
                JOIN users u_student ON u_student.id = c.student_id
                JOIN users u_faculty ON u_faculty.id = c.faculty_id
                ORDER BY m.created_at DESC
            `;
            values=[]
        }

        const result = await db.query(query, values);
        return res.status(200).json({
            count: result.rows.length,
            modules: result.rows,
        });
    } catch(err){
        next(err)
    }
}

export async function postModuleHandler(req, res, next){
    try{
        const { id: userId, role } = req.user 
        const { class_id, title, description } = req.body

        if(!class_id || !title || !description){
            return res.status(400).json({ error: 'Must fill all the class fields.' })
        }

        const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id]);
        if (classCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found.' });
        }
        const classData = classCheck.rows[0];

        if (role !== 'admin' && classData.faculty_id !== userId) {
            return res.status(403).json({ 
                error: 'Forbidden: You can only create modules for classes you teach.' 
            });
        }
        const query = `
            INSERT INTO modules (class_id, title, description, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING class_id, title, description, created_by, created_at
        `
        const values = [class_id, title, description, userId]
        const result = await db.query(query, values)
        return res.status(201).json({
            message: 'Module created successfully.',
            modules: result.rows
        })
    } catch(err){
        next(err)
    }
}

export async function patchModuleIdHandler(req, res, next){
    try{
        const { id } = req.params
        const { id: userId, role } = req.user
        const { class_id, title, description } = req.body

        const moduleCheck = await db.query(`
            SELECT m.*, c.faculty_id 
            FROM module m 
            JOIN class c ON c.id = m.class_id 
            WHERE m.id = $1
        `, [id]);

        if (moduleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Module not found.' });
        }
        const existingModule = moduleCheck.rows[0];

        if(role === 'student' && existingModule.created_by !== userId && existingModule.faculty_id !== userId){
            return res.status(403).json({ error: "Forbidden: You're not authorized to update this module."})
        }

        if (class_id) {
            const classCheck = await db.query('SELECT id FROM class WHERE id = $1', [class_id])
            if (classCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Target class not found.' });
            }
        }

        const query = `
            UPDATE module
            SET class_id = COALESCE($1, class_id),
            title = COALESCE($2, title),
            description = COALESCE($3, description)
            WHERE id = $4
            RETURNING class_id, title, description, created_by, created_at
        `

        const values = [class_id, title, description, id]
        const result = await db.query(query, values)
        return res.json({
            message: 'Module successfully updated',
            modules: result.rows[0]
        })
    } catch(err){
        next(err)
    }
}

export async function deleteModuleIdHandler(req, res, next){
    try{
        const { id } = req.params
        const { id: userId, role } = req.user

        const moduleCheck = await db.query(`
            SELECT m.*, c.faculty_id 
            FROM module m 
            JOIN class c ON c.id = m.class_id 
            WHERE m.id = $1
        `, [id]);

        if (moduleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Module not found.' });
        }
        const existingModule = moduleCheck.rows[0];

        if(role !== 'admin' && existingModule.created_by !== userId && existingModule.faculty_id !== userId){
            return res.status(403).json({
                error: "Forbidden: You are not authorized to delete this module.",
            });
        }

        await db.query(`DELETE FROM module WHERE id = $1`, [id])
        return res.status(200).json({ 
            message: `Module ${existingModule.title} was successfully deleted`,
        })
    } catch(err){
        next(err)
    }
}

export default {
    getModuleHandler,
    postModuleHandler,
    patchModuleIdHandler,
    deleteModuleIdHandler
}