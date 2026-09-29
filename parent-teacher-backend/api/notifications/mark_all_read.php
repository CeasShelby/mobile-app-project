<?php
// ============================================================
// Notifications: Mark All Read Endpoint
// File: parent-teacher-backend/notifications/mark_all_read.php
// Clears unread flags for the current user's notifications and messages
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Authenticate user
$currentUser = requireAuth();
$userId = (int)($currentUser['id'] ?? 0);

try {
    $pdo->beginTransaction();

    // 2. Mark system notifications as read
    $nStmt = $pdo->prepare("
        UPDATE notifications
        SET is_read = 1
        WHERE recipient_id = :user_id AND is_read = 0
    ");
    $nStmt->execute([':user_id' => $userId]);
    $notifCount = $nStmt->rowCount();

    // 3. Mark direct chat messages as read for conversations this user participates in
    //    (only marks messages that others sent to this user — not their own messages)
    $mStmt = $pdo->prepare("
        UPDATE messages m
        JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
        SET m.is_read = 1
        WHERE cp.user_id = :user_id
          AND m.sender_id != :user_id2
          AND m.is_read = 0
    ");
    $mStmt->execute([':user_id' => $userId, ':user_id2' => $userId]);
    $msgCount = $mStmt->rowCount();

    $pdo->commit();

    // 4. Return standardized response
    sendSuccess([
        'notifications_cleared' => $notifCount,
        'messages_cleared'      => $msgCount,
    ], "All notifications and unread messages marked as read.");

} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError("Database query failed: " . $e->getMessage(), null, 500);
}
