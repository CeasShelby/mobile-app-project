<?php
// Suppress warnings/notices so PHP output is always clean JSON
ini_set('display_errors', '0');
error_reporting(0);

// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth_middleware.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

    // 1. Check if conversation thread exists between sender and receiver
    $cStmt = $pdo->prepare("
        SELECT cp1.conversation_id 
        FROM conversation_participants cp1
        JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
        WHERE cp1.user_id = ? AND cp2.user_id = ?
        LIMIT 1
    ");
    $cStmt->execute([$senderId, $receiverId]);
    $convo = $cStmt->fetch(PDO::FETCH_ASSOC);

    $conversationId = 0;

    if ($convo) {
        $conversationId = (int)$convo['conversation_id'];
    } else {
        // Create new conversation thread
        $insConvo = $pdo->prepare("INSERT INTO conversations (created_at, updated_at) VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        $insConvo->execute();
        $conversationId = (int)$pdo->lastInsertId();

        // Add both participants
        $pStmt = $pdo->prepare("INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)");
        $pStmt->execute([$conversationId, $senderId, $conversationId, $receiverId]);
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

    // 4. Create event notification alert for receiver safely
    try {
        $senderStmt = $pdo->prepare("SELECT full_name FROM users WHERE id = ?");
        $senderStmt->execute([$senderId]);
        $senderUser = $senderStmt->fetch(PDO::FETCH_ASSOC);
        $senderName = $senderUser ? $senderUser['full_name'] : 'User';

        $notifStmt = $pdo->prepare("
            INSERT INTO notifications (recipient_id, type, title, message, payload_json, is_read)
            VALUES (?, 'message', ?, ?, ?, 0)
        ");
        $notifTitle = "New message from " . $senderName;
        $notifMsg   = mb_substr($messageText, 0, 100);
        $payload    = json_encode([
            'conversation_id' => $conversationId,
            'sender_id'       => $senderId,
            'message_id'      => $newMessageId,
        ]);
        $notifStmt->execute([$receiverId, $notifTitle, $notifMsg, $payload]);
    } catch (\Exception $e) {
        // Log notification insertion failure silently
        error_log("Failed to insert message notification alert: " . $e->getMessage());
    }

    echo json_encode([
        "success" => true,
        "message" => "Message sent successfully",
        "id"      => $newMessageId,
        "conversation_id" => $conversationId
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
