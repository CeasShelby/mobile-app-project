<?php
// ============================================================
// Real-Time Event Notifications Center Endpoint
// File: parent-teacher-backend/notifications/get_notifications.php
// Returns chronological event alerts with type filtering & mark-as-read options
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

// 1. Authenticate user
$currentUser = requireAuth();
$userId = (int)($currentUser['id'] ?? 0);

// 2. Read query options
$typeFilter = isset($_GET['type']) ? trim($_GET['type']) : '';
$markRead   = isset($_GET['mark_read']) && $_GET['mark_read'] == '1';

try {
    // 3. Build notification query
    $sql    = "
        SELECT id, recipient_id, type, title, message, payload_json, is_read, created_at
        FROM notifications
        WHERE recipient_id = :user_id
    ";
    $params = [':user_id' => $userId];

    $allowedTypes = ['attendance', 'result', 'announcement', 'message'];
    if (!empty($typeFilter) && in_array($typeFilter, $allowedTypes)) {
        $sql .= " AND type = :type_filter";
        $params[':type_filter'] = $typeFilter;
    }

    $sql .= " ORDER BY created_at DESC LIMIT 50";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse payload_json for frontend convenience
    foreach ($notifications as &$n) {
        $n['payload'] = !empty($n['payload_json'])
            ? json_decode($n['payload_json'], true)
            : null;
        unset($n['payload_json']); // Don't double-send raw JSON string
    }
    unset($n);

    // 4. Mark as read if requested
    if ($markRead) {
        $updateStmt = $pdo->prepare("
            UPDATE notifications
            SET is_read = 1
            WHERE recipient_id = :user_id AND is_read = 0
        ");
        $updateStmt->execute([':user_id' => $userId]);
    }

    // 5. Get remaining unread count
    $unreadStmt = $pdo->prepare("
        SELECT COUNT(id) AS unread_total
        FROM notifications
        WHERE recipient_id = :user_id AND is_read = 0
    ");
    $unreadStmt->execute([':user_id' => $userId]);
    $unreadCount = (int)($unreadStmt->fetchColumn() ?? 0);

    // 6. Return standardized response
    sendSuccess([
        'notifications' => $notifications,
        'unread_count'  => $unreadCount,
    ], "Notifications fetched successfully");

} catch (\PDOException $e) {
    sendError("Database query failed: " . $e->getMessage(), null, 500);
}
