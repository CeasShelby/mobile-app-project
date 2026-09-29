<?php
// ============================================================
// Real-Time Sync: Get Unread Message & Notification Counts
// File: parent-teacher-backend/notifications/get_unread_counts.php
// Standardized to use sendSuccess() consistent with all other endpoints
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Authenticate Request via JWT header
$currentUser = requireAuth();
$userId = (int)($currentUser['id'] ?? 0);

if ($userId <= 0) {
    sendError("Unable to identify user from token.", null, 401);
}

try {
    // 2. Count unread chat messages for conversations this user participates in
    //    (excludes messages the user themselves sent)
    $msgStmt = $pdo->prepare("
        SELECT COUNT(m.id) AS unread_messages
        FROM messages m
        JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
        WHERE cp.user_id = :user_id
          AND m.sender_id != :user_id2
          AND m.is_read = 0
    ");
    $msgStmt->execute([':user_id' => $userId, ':user_id2' => $userId]);
    $unreadMessages = (int)($msgStmt->fetchColumn() ?? 0);

    // 3. Count unread event notifications directed to this user
    $notifStmt = $pdo->prepare("
        SELECT COUNT(id) AS unread_notifications
        FROM notifications
        WHERE recipient_id = :user_id AND is_read = 0
    ");
    $notifStmt->execute([':user_id' => $userId]);
    $unreadNotifications = (int)($notifStmt->fetchColumn() ?? 0);

    // 4. Return standardized response
    sendSuccess([
        "unread_messages"      => $unreadMessages,
        "unread_notifications" => $unreadNotifications,
        "total_unread"         => $unreadMessages + $unreadNotifications,
    ], "Unread counts fetched successfully");

} catch (\PDOException $e) {
    sendError("Database query failed: " . $e->getMessage(), null, 500);
}
