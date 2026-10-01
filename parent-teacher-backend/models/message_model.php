<?php
// ============================================================
// Messaging Model Functions
// File: parent-teacher-backend/models/message_model.php
// Description: Reusable database functions for `conversations`, `conversation_participants`, and `messages` tables.
// ============================================================

/**
 * Fetches active conversation threads for a specific user.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Current authenticated user ID
 * @return array List of conversation threads with participant details
 */
function getUserConversations($pdo, $userId) {
    $stmt = $pdo->prepare("
        SELECT 
            c.id as conversation_id,
            c.student_id,
            c.updated_at as last_activity,
            s.full_name as student_name,
            (
                SELECT m.message_text 
                FROM messages m 
                WHERE m.conversation_id = c.id 
                ORDER BY m.created_at DESC LIMIT 1
            ) as last_message,
            (
                SELECT m.created_at 
                FROM messages m 
                WHERE m.conversation_id = c.id 
                ORDER BY m.created_at DESC LIMIT 1
            ) as last_message_time
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        LEFT JOIN students s ON c.student_id = s.id
        WHERE cp.user_id = ?
        ORDER BY c.updated_at DESC
    ");
    $stmt->execute([(int)$userId]);
    return $stmt->fetchAll();
}

/**
 * Fetches chronological messages inside a conversation thread.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $conversationId Target conversation thread ID
 * @param int $limit Max messages to return
 * @return array List of message items
 */
function getConversationMessages($pdo, $conversationId, $limit = 50) {
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_text,
            m.is_read,
            m.created_at,
            u.full_name as sender_name,
            u.role as sender_role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
        LIMIT ?
    ");
    $stmt->bindValue(1, (int)$conversationId, PDO::PARAM_INT);
    $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/**
 * Posts a new direct message into a conversation thread.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $conversationId Target conversation ID
 * @param int $senderUserId Sender's user ID
 * @param string $messageText Message body text
 * @return int Newly created message primary key ID
 */
function sendMessage($pdo, $conversationId, $senderUserId, $messageText) {
    $stmt = $pdo->prepare("
        INSERT INTO messages (conversation_id, sender_id, message_text, is_read) 
        VALUES (?, ?, ?, 0)
    ");
    $stmt->execute([(int)$conversationId, (int)$senderUserId, trim($messageText)]);
    $messageId = (int)$pdo->lastInsertId();

    // Update conversation last activity timestamp
    $pdo->prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([(int)$conversationId]);

    return $messageId;
}

/**
 * Creates a new conversation thread between participants.
 *
 * @param PDO $pdo Active database connection instance
 * @param int|null $studentId Optional context student ID
 * @param array $participantUserIds Array of user IDs joining the thread
 * @return int Newly created conversation ID
 */
function createConversationThread($pdo, $studentId, array $participantUserIds) {
    $pdo->prepare("INSERT INTO conversations (student_id) VALUES (?)")
        ->execute([$studentId ? (int)$studentId : null]);
    $convoId = (int)$pdo->lastInsertId();

    $pStmt = $pdo->prepare("INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)");
    foreach ($participantUserIds as $uid) {
        $pStmt->execute([$convoId, (int)$uid]);
    }

    return $convoId;
}