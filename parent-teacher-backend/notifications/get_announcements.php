<?php
// Include database configuration and token validation middleware from the parent directory
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in. Returns decoded JWT payload.
$currentUser = authenticate_request();

try {
    $role = $currentUser['role'];
    
    // Base SQL: Fetch announcements and join with users to get the author's full name
    $query = "SELECT a.*, u.full_name AS author_name FROM announcements a JOIN users u ON a.created_by = u.id ";
    
    // Filter announcements based on user role:
    // Teachers see 'all' or 'teachers'. Parents see 'all' or 'parents'. Admins see everything.
    if ($role === 'teacher') {
        $query .= "WHERE a.target_audience IN ('all', 'teachers') ";
    } elseif ($role === 'parent') {
        $query .= "WHERE a.target_audience IN ('all', 'parents') ";
    }
    
    $query .= "ORDER BY a.created_at DESC";
    
    // Prepare and execute the query
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $announcements = $stmt->fetchAll();
    
    // Return announcements list
    echo json_encode($announcements);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
    exit();
}
