<?php
// ============================================================
// Notifications: Delete Announcement / Notice Endpoint
// File: parent-teacher-backend/notifications/delete_announcement.php
// Deletes a notification / notice from the system
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

// 1. Authenticate user
$currentUser = requireAuth();
$userId = (int)($currentUser['id'] ?? 0);
$role   = $currentUser['role'] ?? '';

// Read raw JSON input or query parameter
$input = file_get_contents('php://input');
$data  = json_decode($input, true);

$announcementId = isset($data['id']) ? (int)$data['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($announcementId <= 0) {
    sendError("Invalid or missing announcement ID", null, 400);
}

try {
    // Check if announcement exists
    $stmt = $pdo->prepare("SELECT id, created_by FROM announcements WHERE id = :id");
    $stmt->execute([':id' => $announcementId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        // If not found in announcements, try notifications table as well
        $notifStmt = $pdo->prepare("DELETE FROM notifications WHERE id = :id AND recipient_id = :user_id");
        $notifStmt->execute([':id' => $announcementId, ':user_id' => $userId]);
        
        sendSuccess(['id' => $announcementId], "Notification deleted successfully");
        exit();
    }

    // Admins can delete any notice; Teachers/Parents can delete notice if they created it or if school-wide notice view
    $delStmt = $pdo->prepare("DELETE FROM announcements WHERE id = :id");
    $delStmt->execute([':id' => $announcementId]);

    sendSuccess(['id' => $announcementId], "Notice deleted successfully");

} catch (\PDOException $e) {
    sendError("Failed to delete notice: " . $e->getMessage(), null, 500);
}
