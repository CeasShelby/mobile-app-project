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

    // Fetch direct messages between current user and other user via conversations table
    $sql = "
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
        JOIN conversations c ON m.conversation_id = c.id
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN parents p ON c.parent_id = p.id
        LEFT JOIN teachers t ON c.teacher_id = t.id
        WHERE (p.user_id = ? AND t.user_id = ?)
           OR (p.user_id = ? AND t.user_id = ?)
           OR (m.sender_id = ? AND c.id IN (SELECT id FROM conversations WHERE parent_id = ? OR teacher_id = ?))
        ORDER BY m.created_at ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $currentUserId, $otherUserId, $currentUserId,
        $currentUserId, $otherUserId,
        $otherUserId, $currentUserId,
        $currentUserId, $otherUserId, $otherUserId
    ]);
    $messages = $stmt->fetchAll();

    // Mark incoming messages as read
    if (!empty($messages)) {
        $updateStmt = $pdo->prepare("
            UPDATE messages m
            JOIN conversations c ON m.conversation_id = c.id
            SET m.is_read = 1 
            WHERE m.sender_id = ? AND m.is_read = 0
        ");
        $updateStmt->execute([$otherUserId]);
    }

    echo json_encode($messages ? $messages : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}

