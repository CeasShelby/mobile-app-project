<?php
// ============================================================
// Get Conversation Messages API Endpoint
// File: parent-teacher-backend/api/messaging/get_messages.php
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';

$currentUser = requireAuth();

$otherUserId = isset($_GET['other_user_id']) ? intval($_GET['other_user_id']) : 0;

if ($otherUserId <= 0) {
    sendError("Please provide a valid other_user_id query parameter", null, 400);
}

try {
    $currentUserId = (int)$currentUser['id'];

    // 1. Find conversation ID shared between currentUserId and otherUserId
    $convoStmt = $pdo->prepare("
        SELECT cp1.conversation_id 
        FROM conversation_participants cp1
        JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
        WHERE cp1.user_id = ? AND cp2.user_id = ?
        LIMIT 1
    ");
    $convoStmt->execute([$currentUserId, $otherUserId]);
    $convo = $convoStmt->fetch(PDO::FETCH_ASSOC);

    if (!$convo) {
        sendSuccess([], "No previous messages");
    }

    $conversationId = (int)$convo['conversation_id'];

    // 2. Fetch all messages in this thread using model function
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.conversation_id,
            m.sender_id,
            IF(m.sender_id = ?, ?, ?) AS receiver_id,
            m.message_text AS message_text,
            m.is_read,
            m.created_at,
            u.full_name AS sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
    ");
    $stmt->execute([$currentUserId, $otherUserId, $currentUserId, $conversationId]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Mark unread messages sent by otherUserId as read
    $markStmt = $pdo->prepare("
        UPDATE messages 
        SET is_read = 1 
        WHERE conversation_id = ? AND sender_id = ? AND is_read = 0
    ");
    $markStmt->execute([$conversationId, $otherUserId]);

    sendSuccess($messages ? $messages : [], "Messages loaded successfully");

} catch (Exception $e) {
    sendError("Failed to fetch messages: " . $e->getMessage(), null, 500);
}


