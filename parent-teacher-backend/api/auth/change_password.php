<?php
// ============================================================
// Change Password API Endpoint
// File: parent-teacher-backend/api/auth/change_password.php
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Require JWT Authentication
$authUser = requireAuth();

// 2. Parse JSON Request Input
$input = getJsonInput();

$currentPassword = isset($input['current_password']) ? trim($input['current_password']) : '';
$newPassword     = isset($input['new_password']) ? trim($input['new_password']) : '';

// 3. Input Validation
if (empty($currentPassword) || empty($newPassword)) {
    sendError("Both current password and new password are required.", null, 400);
}

if (strlen($newPassword) < 6) {
    sendError("New password must be at least 6 characters long.", null, 400);
}

try {
    // 4. Fetch current password hash from MySQL
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$authUser['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError("User account not found.", null, 404);
    }

    // 5. Verify current password
    if (!password_verify($currentPassword, $user['password'])) {
        sendError("Current password is incorrect.", null, 400);
    }

    // 6. Hash new password with Bcrypt
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

    // 7. Update password in MySQL
    $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $updateStmt->execute([$newHash, $authUser['id']]);

    sendSuccess(null, "Password updated successfully. Please use your new password next time you sign in.");
} catch (Exception $e) {
    sendError("Failed to update password: " . $e->getMessage(), null, 500);
}
