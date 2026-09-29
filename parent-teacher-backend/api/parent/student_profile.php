<?php
ini_set('display_errors', '0');
error_reporting(0);
// ============================================================
// Student Profile & History API Endpoint
// File: parent-teacher-backend/api/parent/student_profile.php
// Description: Fetches detailed biographical, academic, attendance,
// and guardian information using model helper functions.
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';

// 1. Enforce authentication (Parents & Admins allowed)
$authUser = requireAuth(['parent', 'admin']);

// 2. Validate student_id parameter
$studentId = isset($_GET['student_id']) ? (int)$_GET['student_id'] : 0;

try {
    // 3. Authorization check for Parents
    if ($authUser['role'] === 'parent') {
        $parentId = getOrCreateParentId($pdo, $authUser['id']);
        $linkedStudents = getLinkedStudentsForParent($pdo, $parentId);

        if (empty($linkedStudents)) {
            sendError('No linked student records found for your parent account.', 404);
            exit();
        }

        if ($studentId <= 0) {
            $studentId = (int)$linkedStudents[0]['id'];
        } else {
            $isLinked = verifyParentStudentRelationship($pdo, $parentId, $studentId);
            if (!$isLinked) {
                sendError('Unauthorized access: This student is not linked to your parent account.', 403);
                exit();
            }
        }
    }

    if ($studentId <= 0) {
        sendError('Missing or invalid student_id parameter.', 400);
        exit();
    }

    // 4. Fetch Student Profile Details via Model Function
    $student = findStudentById($pdo, $studentId);
    if (!$student) {
        sendError('Student record not found.', 404);
        exit();
    }

    // 5. Fetch Homeroom Teacher Details via Model Function
    $homeroomTeacher = getHomeroomTeacherForClass($pdo, (int)$student['class_id']);

    // 6. Fetch Parent / Guardian Information via Model Function
    $guardian = null;
    if ($authUser['role'] === 'parent') {
        $parentRecord = findParentByUserId($pdo, $authUser['id']);
        if ($parentRecord) {
            $guardian = [
                'name' => $parentRecord['full_name'],
                'email' => $parentRecord['email'],
                'phone' => $parentRecord['phone_number'] ?? '',
                'occupation' => $parentRecord['occupation'] ?? '',
                'address' => $parentRecord['address'] ?? '',
            ];
        }
    }

    // 7. Fetch Full Attendance Logs via Model Function
    $attendanceLogs = getAttendanceByStudent($pdo, $studentId, 100);
    $attendanceStats = getAttendanceSummaryStats($pdo, $studentId);

    // 8. Fetch Academic Report Cards & Assessment Marks via Model Function
    $academicData = getStudentAcademicSummary($pdo, $studentId);

    // 9. Send Standardized Success Response
    sendSuccess([
        'student' => [
            'id' => (int)$student['id'],
            'admission_number' => $student['admission_number'],
            'full_name' => $student['full_name'],
            'first_name' => $student['first_name'] ?? '',
            'last_name' => $student['last_name'] ?? '',
            'gender' => ucfirst($student['gender'] ?? 'Student'),
            'date_of_birth' => $student['date_of_birth'] ?? 'N/A',
            'status' => ucfirst($student['status'] ?? 'Active'),
            'class_id' => (int)$student['class_id'],
            'class_name' => $student['class_name'] ?? 'Unassigned',
            'grade_level' => (int)($student['grade_level'] ?? 1),
        ],
        'homeroom_teacher' => $homeroomTeacher,
        'guardian' => $guardian,
        'attendance' => [
            'stats' => $attendanceStats,
            'percentage' => $attendanceStats['percentage'],
            'logs' => array_map(function($log) {
                return [
                    'id' => (int)$log['id'],
                    'date' => $log['attendance_date'],
                    'status' => strtolower($log['status']),
                    'remarks' => $log['remarks'] ?? '',
                    'recorded_by' => $log['recorded_by_name'] ?? 'System',
                ];
            }, $attendanceLogs)
        ],
        'academic' => $academicData,
    ], 'Student profile loaded successfully');

} catch (Exception $e) {
    sendError('Failed to load student profile: ' . $e->getMessage(), 500);
}
