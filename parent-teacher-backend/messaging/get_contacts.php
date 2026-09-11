<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

try {
    $role = $currentUser['role'];
    $contacts = [];

    if ($role === 'parent') {
        // Parents see teachers. Typically, they see teachers teaching their students' classes.
        // For simplicity in this database setup, let's fetch all active teachers in the system.
        $stmt = $pdo->query("
            SELECT u.id AS contact_user_id, u.full_name, u.email, u.profile_picture, 'teacher' as role_label, t.specialization 
            FROM teachers t 
            JOIN users u ON t.user_id = u.id 
            WHERE u.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $contacts = $stmt->fetchAll();
    } elseif ($role === 'teacher') {
        // Teachers see parents of students in the school.
        $stmt = $pdo->query("
            SELECT u.id AS contact_user_id, u.full_name, u.email, u.profile_picture, 'parent' as role_label, p.occupation 
            FROM parents p 
            JOIN users u ON p.user_id = u.id 
            WHERE u.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $contacts = $stmt->fetchAll();
    } else {
        // Admins can see all active users (teachers and parents) to message
        $stmt = $pdo->prepare("
            SELECT u.id AS contact_user_id, u.full_name, u.email, u.profile_picture, u.role as role_label 
            FROM users u 
            WHERE u.id != ? AND u.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([$currentUser['id']]);
        $contacts = $stmt->fetchAll();
    }

    echo json_encode($contacts);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
