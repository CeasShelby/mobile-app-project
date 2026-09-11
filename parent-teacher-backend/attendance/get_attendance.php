<?php
// ============================================================
// Attendance History API Endpoint
// File: parent-teacher-backend/attendance/get_attendance.php
// Description: Fetches student attendance logs using model helper functions.
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/init_models.php';

// Authenticate request (Parents, Teachers, Admins allowed)
$authUser = requireAuth(['parent', 'teacher', 'admin']);

$studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
if ($studentId <= 0) {
    sendError('Please provide a valid student_id query parameter', null, 400);
}

try {
    // Authorization check: If a parent is logged in, verify relationship
    if ($authUser['role'] === 'parent') {
        $parentId = getOrCreateParentId($pdo, $authUser['id']);
        $isLinked = verifyParentStudentRelationship($pdo, $parentId, $studentId);

        if (!$isLinked) {
            sendError("Access denied: You are not authorized to view this student's records.", null, 403);
        }
    }

    // Fetch attendance logs via Model Function
    $records = getAttendanceByStudent($pdo, $studentId, 50);

    sendSuccess($records, 'Attendance records fetched successfully');

} catch (\PDOException $e) {
    sendError('Database query failed: ' . $e->getMessage(), null, 500);
}
