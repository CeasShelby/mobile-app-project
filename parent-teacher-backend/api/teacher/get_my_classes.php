<?php
// ============================================================
// Get Teacher Assigned Classes API Endpoint
// File: parent-teacher-backend/api/teacher/get_my_classes.php
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth_middleware.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';

$currentUser = requireAuth(['teacher', 'admin']);

try {
    $userId = (int)$currentUser['id'];

    $teacher = findTeacherByUserId($pdo, $userId);
    if (!$teacher) {
        $insT = $pdo->prepare("INSERT INTO teachers (user_id, status) VALUES (?, 'active')");
        $insT->execute([$userId]);
        $teacherId = (int)$pdo->lastInsertId();
    } else {
        $teacherId = (int)$teacher['id'];
    }

    $classes = getTeacherAssignedClasses($pdo, $teacherId);
    sendSuccess($classes, "Teacher classes loaded successfully");

} catch (Exception $e) {
    sendError("Failed to load teacher classes: " . $e->getMessage(), null, 500);
}

