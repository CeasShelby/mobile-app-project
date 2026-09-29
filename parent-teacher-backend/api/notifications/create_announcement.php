<?php
// ============================================================
// Announcements: Publish Class or School Notice Endpoint
// File: parent-teacher-backend/notifications/create_announcement.php
// Posts school-wide bulletins or stream-scoped notices & notifies recipients
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Authenticate user
$currentUser = requireAuth();
$userId   = (int)($currentUser['id'] ?? 0);
$userRole = $currentUser['role'] ?? '';

// 2. Authorization: Only teachers and admins can post notices
if ($userRole !== 'teacher' && $userRole !== 'admin') {
    sendError("Access denied: Only teachers and admins can publish announcements.", null, 403);
}

// 3. Read request body
$input = getJsonInput();

$title          = isset($input['title'])           ? trim($input['title'])           : '';
$content        = isset($input['content'])         ? trim($input['content'])         : '';
$targetAudience = isset($input['target_audience']) ? trim($input['target_audience']) : 'all';
$classId        = (isset($input['class_id']) && is_numeric($input['class_id']) && (int)$input['class_id'] > 0)
                    ? (int)$input['class_id'] : null;

if (empty($title) || empty($content)) {
    sendError("Both notice title and content are required.", null, 400);
}

if (!in_array($targetAudience, ['all', 'parents', 'teachers'])) {
    $targetAudience = 'all';
}

try {
    $pdo->beginTransaction();

    // 4. Insert announcement (class_id column exists permanently now via migrate.sql)
    $stmt = $pdo->prepare("
        INSERT INTO announcements (title, content, target_audience, class_id, created_by)
        VALUES (:title, :content, :target_audience, :class_id, :created_by)
    ");
    $stmt->execute([
        ':title'           => $title,
        ':content'         => $content,
        ':target_audience' => $targetAudience,
        ':class_id'        => $classId,
        ':created_by'      => $userId,
    ]);
    $announcementId = (int)$pdo->lastInsertId();

    // 5. Collect recipient user IDs for in-app notification dispatch
    $recipientUserIds = [];

    if ($classId !== null) {
        // Stream-specific: target parents of students in this class
        if (in_array($targetAudience, ['all', 'parents'])) {
            $pStmt = $pdo->prepare("
                SELECT DISTINCT p.user_id
                FROM parents p
                JOIN parent_students ps ON p.id = ps.parent_id
                JOIN students s ON ps.student_id = s.id
                WHERE s.class_id = :class_id AND p.user_id != :sender_id
            ");
            $pStmt->execute([':class_id' => $classId, ':sender_id' => $userId]);
            $recipientUserIds = array_merge($recipientUserIds, $pStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        // Target teachers assigned to this class stream
        if (in_array($targetAudience, ['all', 'teachers'])) {
            $tStmt = $pdo->prepare("
                SELECT DISTINCT t.user_id
                FROM teachers t
                JOIN teacher_classes tc ON t.id = tc.teacher_id
                WHERE tc.class_id = :class_id AND t.user_id != :sender_id
            ");
            $tStmt->execute([':class_id' => $classId, ':sender_id' => $userId]);
            $recipientUserIds = array_merge($recipientUserIds, $tStmt->fetchAll(PDO::FETCH_COLUMN));
        }
    } else {
        // School-wide notice
        if (in_array($targetAudience, ['all', 'parents'])) {
            $pStmt = $pdo->prepare("SELECT user_id FROM parents WHERE user_id != :sender_id");
            $pStmt->execute([':sender_id' => $userId]);
            $recipientUserIds = array_merge($recipientUserIds, $pStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        if (in_array($targetAudience, ['all', 'teachers'])) {
            $tStmt = $pdo->prepare("SELECT user_id FROM teachers WHERE user_id != :sender_id");
            $tStmt->execute([':sender_id' => $userId]);
            $recipientUserIds = array_merge($recipientUserIds, $tStmt->fetchAll(PDO::FETCH_COLUMN));
        }
    }

    $recipientUserIds = array_unique(array_map('intval', $recipientUserIds));

    // 6. Insert notification alerts for all recipients
    if (!empty($recipientUserIds)) {
        $notifStmt = $pdo->prepare("
            INSERT INTO notifications (recipient_id, type, title, message, payload_json, is_read)
            VALUES (:recipient_id, 'announcement', :title, :message, :payload_json, 0)
        ");

        $payloadJson = json_encode([
            'announcement_id' => $announcementId,
            'class_id'        => $classId,
            'target_audience' => $targetAudience,
        ]);

        foreach ($recipientUserIds as $recipientId) {
            if ($recipientId > 0) {
                $notifStmt->execute([
                    ':recipient_id' => $recipientId,
                    ':title'        => 'New Notice: ' . mb_substr($title, 0, 40),
                    ':message'      => mb_substr($content, 0, 100),
                    ':payload_json' => $payloadJson,
                ]);
            }
        }
    }

    $pdo->commit();

    // 7. Return standardized success response
    sendSuccess([
        'id'                  => $announcementId,
        'recipients_notified' => count($recipientUserIds),
    ], "Notice published successfully!");

} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError("Database operation failed: " . $e->getMessage(), null, 500);
}
