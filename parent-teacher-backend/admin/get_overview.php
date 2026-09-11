<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only administrators can view system overview metrics."]);
    exit();
}

try {
    $totalClasses  = (int)$pdo->query("SELECT COUNT(*) FROM classes")->fetchColumn();
    $totalStudents = (int)$pdo->query("SELECT COUNT(*) FROM students WHERE status = 'active'")->fetchColumn();
    $totalTeachers = (int)$pdo->query("SELECT COUNT(*) FROM teachers")->fetchColumn();
    $totalParents  = (int)$pdo->query("SELECT COUNT(*) FROM parents")->fetchColumn();
    $totalStaff    = (int)$pdo->query("SELECT COUNT(*) FROM staff")->fetchColumn();

    echo json_encode([
        "success" => true,
        "metrics" => [
            "total_classes"  => $totalClasses,
            "total_students" => $totalStudents,
            "total_teachers" => $totalTeachers,
            "total_parents"  => $totalParents,
            "total_staff"    => $totalStaff
        ]
    ]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
