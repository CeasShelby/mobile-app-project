<?php
// ============================================================
// Parent Dashboard API Endpoint
// File: parent-teacher-backend/api/parent/dashboard.php
// Description: Fetches live dashboard data for authenticated parents,
// using model entity helper functions.
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';

// 1. Enforce authentication and verify role
$authUser = requireAuth(['parent', 'admin']);

try {
    // 2. Fetch or auto-create parent table record via Model Function
    $parentId = getOrCreateParentId($pdo, $authUser['id']);

    // 3. Fetch linked active students via Model Function
    $students = getLinkedStudentsForParent($pdo, $parentId);

    $studentsData = [];

    // 4. Populate child attendance stats & latest grades using Model Functions
    foreach ($students as $s) {
        $studentId = (int)$s['id'];
        $classId   = (int)($s['class_id'] ?? 0);

        $attStats = getAttendanceSummaryStats($pdo, $studentId);
        $academicSummary = getStudentAcademicSummary($pdo, $studentId);
        $teacherObj = getHomeroomTeacherForClass($pdo, $classId);

        $studentsData[] = [
            'id' => $studentId,
            'admission_number' => $s['admission_number'] ?: ('STU-2026-0' . $studentId),
            'full_name' => $s['full_name'],
            'class_id' => $classId,
            'class_name' => $s['class_name'] ?: 'Unassigned Class',
            'relationship' => ucfirst($s['relationship_type'] ?: 'guardian'),
            'homeroom_teacher' => $teacherObj['name'],
            'attendance' => $attStats,
            'recent_grades' => array_slice($academicSummary['records'], 0, 3)
        ];
    }

    // 5. Fetch Active Announcements via Model Function
    $announcements = getPublishedAnnouncements($pdo, 'parents', 5);

    // 6. Return Standardized Response
    sendSuccess([
        'parent_name' => $authUser['full_name'],
        'students' => $studentsData,
        'announcements' => array_map(function($a) {
            return [
                'id' => (int)$a['id'],
                'title' => $a['title'],
                'content' => $a['content'],
                'date' => date('Y-m-d', strtotime($a['created_at'])),
                'author' => $a['author_name'] ?: 'School Administration'
            ];
        }, $announcements)
    ], 'Parent dashboard loaded successfully');

} catch (Exception $e) {
    sendError('Failed to load parent dashboard: ' . $e->getMessage(), 500);
}
