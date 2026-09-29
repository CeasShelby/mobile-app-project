<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

// Read other_user_id (with whom the conversation is happening)
$otherUserId = isset($_GET['other_user_id']) ? intval($_GET['other_user_id']) : 0;

if ($otherUserId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide a valid other_user_id query parameter"]);
    exit();
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
        echo json_encode([]);
        exit();
    }

    $conversationId = (int)$convo['conversation_id'];

    // 2. Fetch all messages in this thread
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.conversation_id,
            m.sender_id,
            IF(m.sender_id = ?, ?, ?) AS receiver_id,
            m.message AS message_text,
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

    echo json_encode($messages ? $messages : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}

