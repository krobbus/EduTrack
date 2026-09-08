// restrict access based on role
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: You do not have permission to perform this action.' 
      });
    }
    next();
  };
}

// TODO: add authRoute
// users
app.route('/api/users')
  .get(authorizeRoles('admin'), getUsersHandler)
  .post(authorizeRoles('admin'), postUserHandler);

app.route('/api/users/:id')
  .get(authorizeRoles('admin', 'faculty', 'student'), getUserByIdHandler)
  .patch(authorizeRoles('admin'), patchUserHandler)
  .delete(authorizeRoles('admin'), deleteUserHandler);

// enrollments
app.route('/api/enrollments')
  .get(authorizeRoles('admin', 'faculty', 'student'), getEnrollmentsHandler)
  .post(authorizeRoles('admin', 'faculty', 'student'), postEnrollmentHandler);

app.route('/api/enrollments/:id')
  .patch(authorizeRoles('admin', 'faculty'), patchEnrollmentHandler)
  .delete(authorizeRoles('admin', 'faculty', 'student'), deleteEnrollmentHandler);

// modules
app.route('/api/modules')
  .get(authorizeRoles('faculty', 'student'), getModulesHandler)
  .post(authorizeRoles('faculty'), postModuleHandler);

app.route('/api/modules/:id')
  .get(authorizeRoles('faculty', 'student'), getModuleByIdHandler)
  .patch(authorizeRoles('faculty'), patchModuleHandler)
  .delete(authorizeRoles('faculty'), deleteModuleHandler);

  // assignments
app.route('/api/assignments')
  .get(authorizeRoles('faculty', 'student'), getAssignmentsHandler)
  .post(authorizeRoles('faculty'), postAssignmentHandler);

app.route('/api/assignments/:id')
  .get(authorizeRoles('faculty', 'student'), getAssignmentByIdHandler)
  .patch(authorizeRoles('faculty'), patchAssignmentHandler)
  .delete(authorizeRoles('faculty'), deleteAssignmentHandler);

  // submissions
app.route('/api/submissions')
  .get(authorizeRoles('faculty', 'student'), getSubmissionsHandler)
  .post(authorizeRoles('student'), postSubmissionHandler);

app.route('/api/submissions/:id')
  .get(authorizeRoles('faculty', 'student'), getSubmissionByIdHandler)
  .patch(authorizeRoles('faculty', 'student'), patchSubmissionHandler)
  .delete(authorizeRoles('student'), deleteSubmissionHandler);

// meetings
app.route('/api/meetings')
  .get(authorizeRoles('faculty', 'student'), getMeetingsHandler)
  .post(authorizeRoles('faculty'), postMeetingHandler);

app.route('/api/meetings/:id')
  .get(authorizeRoles('faculty', 'student'), getMeetingByIdHandler)
  .patch(authorizeRoles('faculty'), patchMeetingHandler)
  .delete(authorizeRoles('faculty'), deleteMeetingHandler);

// attendance
app.route('/api/attendance')
  .get(authorizeRoles('faculty', 'student'), getAttendanceHandler)
  .post(authorizeRoles('faculty', 'student'), postAttendanceHandler);

app.route('/api/attendance/:id')
  .patch(authorizeRoles('faculty'), patchAttendanceHandler)
  .delete(authorizeRoles('faculty'), deleteAttendanceHandler);

// notes
app.route('/api/notes')
  .get(authorizeRoles('admin', 'faculty', 'student'), getNotesHandler)
  .post(authorizeRoles('admin', 'faculty', 'student'), postNoteHandler);

app.route('/api/notes/:id')
  .patch(authorizeRoles('admin', 'faculty', 'student'), patchNoteHandler)
  .delete(authorizeRoles('admin', 'faculty', 'student'), deleteNoteHandler);