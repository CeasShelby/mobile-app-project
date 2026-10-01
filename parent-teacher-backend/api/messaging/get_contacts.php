<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth_middleware.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

try {
    $role = $currentUser['role'];
    $contacts = [];

    $userId = (int)$currentUser['id'];

    if ($role === 'parent') {
        // Parents see active teachers in the school with specialization and unread counts
        $stmt = $pdo->prepare("
            SELECT 
                u.id AS contact_user_id, 
                u.full_name, 
                u.email, 
                u.phone,
                u.profile_picture, 
                'Teacher' as role_label, 
                COALESCE(t.specialization, 'Secondary Subject Teacher') as subtitle,
                (
                    SELECT COUNT(*) 
                    FROM messages m 
                    JOIN conversation_participants cp1 ON m.conversation_id = cp1.conversation_id
                    JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
                    WHERE cp1.user_id = u.id AND cp2.user_id = ? AND m.sender_id = u.id AND m.is_read = 0
                ) as unread_count
            FROM teachers t 
            JOIN users u ON t.user_id = u.id 
            WHERE u.status = 'active' AND u.id != ?
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([$userId, $userId]);
        $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } elseif ($role === 'teacher') {
        // Teachers see Parents, fellow Teachers, and Admins
        $stmt = $pdo->prepare("
            SELECT 
                u.id AS contact_user_id, 
                u.full_name, 
                u.email, 
                u.phone,
                u.profile_picture, 
                CONCAT(UCASE(LEFT(u.role, 1)), LCASE(SUBSTRING(u.role, 2))) as role_label, 
                COALESCE(t.specialization, p_info.subtitle, 'Staff Member') as subtitle,
                (
                    SELECT COUNT(*) 
                    FROM messages m 
                    JOIN conversation_participants cp1 ON m.conversation_id = cp1.conversation_id
                    JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
                    WHERE cp1.user_id = u.id AND cp2.user_id = ? AND m.sender_id = u.id AND m.is_read = 0
                ) as unread_count
            FROM users u
            LEFT JOIN teachers t ON t.user_id = u.id
            LEFT JOIN (
                SELECT p.user_id, GROUP_CONCAT(DISTINCT CONCAT(COALESCE(NULLIF(s.full_name, ''), TRIM(CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,''))), 'Child'), ' (', c.class_name, ')') SEPARATOR ', ') as subtitle
                FROM parents p
                JOIN parent_students ps ON ps.parent_id = p.id
                JOIN students s ON ps.student_id = s.id
                JOIN classes c ON s.class_id = c.id
                GROUP BY p.user_id
            ) p_info ON p_info.user_id = u.id
            WHERE u.status = 'active' AND u.id != ?
            ORDER BY u.role ASC, u.full_name ASC
        ");
        $stmt->execute([$userId, $userId]);
        $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // Admins see all active users
        $stmt = $pdo->prepare("
            SELECT 
                u.id AS contact_user_id, 
                u.full_name, 
                u.email, 
                u.phone,
                u.profile_picture, 
                CONCAT(UCASE(LEFT(u.role, 1)), LCASE(SUBSTRING(u.role, 2))) as role_label,
                u.role as subtitle,
                (
                    SELECT COUNT(*) 
                    FROM messages m 
                    JOIN conversation_participants cp1 ON m.conversation_id = cp1.conversation_id
                    JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
                    WHERE cp1.user_id = u.id AND cp2.user_id = ? AND m.sender_id = u.id AND m.is_read = 0
                ) as unread_count
            FROM users u 
            WHERE u.id != ? AND u.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([$userId, $userId]);
        $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Also include Administrative Staff contacts (Headteacher, Bursar, Counselor)
    $staffStmt = $pdo->prepare("
        SELECT 
            u.id AS contact_user_id, 
            u.full_name, 
            u.email, 
            u.phone,
            u.profile_picture, 
            'Staff' as role_label, 
            COALESCE(st.designation, st.department, 'School Administration') as subtitle,
            (
                SELECT COUNT(*) 
                FROM messages m 
                JOIN conversation_participants cp1 ON m.conversation_id = cp1.conversation_id
                JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
                WHERE cp1.user_id = u.id AND cp2.user_id = ? AND m.sender_id = u.id AND m.is_read = 0
            ) as unread_count
        FROM staff st
        JOIN users u ON st.user_id = u.id 
        WHERE u.status = 'active' AND u.id != ?
        ORDER BY u.full_name ASC
    ");
    $staffStmt->execute([$userId, $userId]);
    $staffContacts = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

    // Merge real staff contacts avoiding duplicates
    $existingIds = array_column($contacts, 'contact_user_id');
    foreach ($staffContacts as $sc) {
        if (!in_array($sc['contact_user_id'], $existingIds)) {
            $contacts[] = $sc;
        }
    }

    // Attach last_message and last_message_time for each contact
    foreach ($contacts as &$c) {
        $contactId = (int)$c['contact_user_id'];
        $mStmt = $pdo->prepare("
            SELECT m.message, m.created_at
            FROM messages m
            JOIN conversation_participants cp1 ON m.conversation_id = cp1.conversation_id
            JOIN conversation_participants cp2 ON m.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ? AND cp2.user_id = ?
            ORDER BY m.id DESC LIMIT 1
        ");
        $mStmt->execute([$userId, $contactId]);
        $lastMsg = $mStmt->fetch(PDO::FETCH_ASSOC);
        if ($lastMsg) {
            $c['last_message'] = $lastMsg['message'];
            $c['last_message_time'] = $lastMsg['created_at'];
        } else {
            $c['last_message'] = null;
            $c['last_message_time'] = null;
        }
    }
    unset($c);

    // Sort contacts array so unread and most recent conversations ALWAYS appear first
    usort($contacts, function($a, $b) {
        $unreadA = (int)($a['unread_count'] ?? 0);
        $unreadB = (int)($b['unread_count'] ?? 0);
        if ($unreadB !== $unreadA) {
            return $unreadB <=> $unreadA;
        }
        $timeA = !empty($a['last_message_time']) ? strtotime($a['last_message_time']) : 0;
        $timeB = !empty($b['last_message_time']) ? strtotime($b['last_message_time']) : 0;
        if ($timeB !== $timeA) {
            return $timeB <=> $timeA;
        }
        return strcasecmp($a['full_name'], $b['full_name']);
    });

    echo json_encode($contacts);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
