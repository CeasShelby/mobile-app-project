<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

// Read raw JSON data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$receiverId  = isset($data['receiver_id']) ? intval($data['receiver_id']) : 0;
$messageText = isset($data['message_text']) ? trim($data['message_text']) : '';

if ($receiverId <= 0 || empty($messageText)) {
    http_response_code(400);
    echo json_encode(["error" => "Please include receiver_id and message_text in JSON format"]);
    exit();
}

try {
    $senderId = (int)$currentUser['id'];

    // 1. Check if a conversation thread already exists between sender and receiver
    $cStmt = $pdo->prepare("
        SELECT c.id 
        FROM conversations c
        LEFT JOIN parents p ON c.parent_id = p.id
        LEFT JOIN teachers t ON c.teacher_id = t.id
        WHERE (p.user_id = ? AND t.user_id = ?)
           OR (p.user_id = ? AND t.user_id = ?)
        LIMIT 1
    ");
    $cStmt->execute([$senderId, $receiverId, $receiverId, $senderId]);
    $convo = $cStmt->fetch();

    $conversationId = 0;

    if ($convo) {
        $conversationId = (int)$convo['id'];
    } else {
        // Find parent primary key and teacher primary key
        $pStmt = $pdo->prepare("SELECT id FROM parents WHERE user_id IN (?, ?)");
        $pStmt->execute([$senderId, $receiverId]);
        $parentRow = $pStmt->fetch();

        $tStmt = $pdo->prepare("SELECT id FROM teachers WHERE user_id IN (?, ?)");
        $tStmt->execute([$senderId, $receiverId]);
        $teacherRow = $tStmt->fetch();

        $parentId  = $parentRow ? (int)$parentRow['id'] : 1;
        $teacherId = $teacherRow ? (int)$teacherRow['id'] : 1;

        $insConvo = $pdo->prepare("INSERT INTO conversations (parent_id, teacher_id) VALUES (?, ?)");
        $insConvo->execute([$parentId, $teacherId]);
        $conversationId = (int)$pdo->lastInsertId();
    }

    // 2. Insert new message record
    $stmt = $pdo->prepare("
        INSERT INTO messages (conversation_id, sender_id, message, is_read) 
        VALUES (?, ?, ?, 0)
    ");
    $stmt->execute([$conversationId, $senderId, $messageText]);
    $newMessageId = (int)$pdo->lastInsertId();

    // 3. Update conversation timestamp
    $pdo->prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$conversationId]);

    echo json_encode([
        "success" => true,
        "message" => "Message sent successfully",
        "id"      => $newMessageId
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}

