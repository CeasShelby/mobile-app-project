<?php
// Include database configuration and token validation middleware
require_once 'config.php';
require_once 'auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

// Read student_id from the query parameters: get_attendance.php?student_id=X
$studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;

if ($studentId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide a valid student_id query parameter"]);
    exit();
}

try {
    // Security check: If a parent is logged in, verify they are actually linked to this student
    if ($currentUser['role'] === 'parent') {
        $linkStmt = $pdo->prepare("SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?");
        $linkStmt->execute([$currentUser['parent_id'], $studentId]);
        $hasLink = $linkStmt->fetch();

        if (!$hasLink) {
            http_response_code(403); // Forbidden
            echo json_encode(["error" => "Access denied: You are not authorized to view this student's records."]);
            exit();
        }
    }

    // Query attendance records: Join classes to get class name, and join teachers & users to get the teacher's name
    $query = "
        SELECT a.*, c.class_name, u.full_name AS recorded_by_name 
        FROM attendance a 
        JOIN classes c ON a.class_id = c.id 
        LEFT JOIN teachers t ON a.recorded_by = t.id 
        LEFT JOIN users u ON t.user_id = u.id 
        WHERE a.student_id = ? 
        ORDER BY a.attendance_date DESC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$studentId]);
    $records = $stmt->fetchAll();

    echo json_encode($records);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
    exit();
}
