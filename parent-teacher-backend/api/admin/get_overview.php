<?php
// ============================================================
// Admin: System Overview Metrics Endpoint
// File: parent-teacher-backend/admin/get_overview.php
// Optimized: Single SQL query replaces 5 separate COUNT() calls
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied: Only administrators can view system overview metrics."]);
    exit();
}

try {
    // OPTIMIZED: Single query with subquery counts instead of 5 separate round-trips.
    // This significantly reduces dashboard load time on the admin screen.
    $stmt = $pdo->query("
        SELECT
            (SELECT COUNT(*) FROM classes)                          AS total_classes,
            (SELECT COUNT(*) FROM students WHERE status = 'active') AS total_students,
            (SELECT COUNT(*) FROM teachers)                         AS total_teachers,
            (SELECT COUNT(*) FROM parents)                          AS total_parents,
            (SELECT COUNT(*) FROM users WHERE role = 'admin')       AS total_staff
    ");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "metrics" => [
            "total_classes"  => (int)($row['total_classes']  ?? 0),
            "total_students" => (int)($row['total_students'] ?? 0),
            "total_teachers" => (int)($row['total_teachers'] ?? 0),
            "total_parents"  => (int)($row['total_parents']  ?? 0),
            "total_staff"    => (int)($row['total_staff']    ?? 0),
        ]
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database operation failed: " . $e->getMessage()]);
}
