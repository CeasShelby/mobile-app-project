<?php
// ============================================================
// Authenticated User Profile API Endpoint
// File: parent-teacher-backend/api/auth/me.php
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Enforce authentication middleware
$authUser = requireAuth();

try {
    // 2. Fetch fresh user account details from MySQL
    $stmt = $pdo->prepare("SELECT id, email, full_name, role, status, profile_picture, created_at FROM users WHERE id = ?");
    $stmt->execute([$authUser['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError("User account not found.", null, 404);
    }

    // 3. Attach role-specific attributes
    if ($user['role'] === 'teacher') {
        $tStmt = $pdo->prepare("SELECT id, employee_number, qualification, specialization FROM teachers WHERE user_id = ?");
        $tStmt->execute([$user['id']]);
        $teacher = $tStmt->fetch();
        if ($teacher) {
            $user['teacher_id']      = $teacher['id'];
            $user['employee_number'] = $teacher['employee_number'];
            $user['qualification']   = $teacher['qualification'];
            $user['specialization']  = $teacher['specialization'];
        }
    } elseif ($user['role'] === 'parent') {
        $pStmt = $pdo->prepare("SELECT id, occupation, address FROM parents WHERE user_id = ?");
        $pStmt->execute([$user['id']]);
        $parent = $pStmt->fetch();
        if ($parent) {
            $user['parent_id']  = $parent['id'];
            $user['occupation'] = $parent['occupation'];
            $user['address']    = $parent['address'];
        }
    }

    sendSuccess($user, "Authenticated profile retrieved successfully.");
} catch (Exception $e) {
    sendError("Failed to fetch user profile: " . $e->getMessage(), null, 500);
}
