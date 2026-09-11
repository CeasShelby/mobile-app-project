<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

try {
    $userId = (int)$currentUser['id'];

    // Find teacher primary key ID for this user
    $tStmt = $pdo->prepare("SELECT id FROM teachers WHERE user_id = ?");
    $tStmt->execute([$userId]);
    $teacher = $tStmt->fetch();

    $teacherId = $teacher ? (int)$teacher['id'] : 1;

    // Fetch classes assigned to this teacher via teacher_classes or homeroom in classes
    $stmt = $pdo->prepare("
        SELECT DISTINCT 
            c.id, 
            c.class_name, 
            c.class_level, 
            c.academic_year,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
        FROM classes c
        LEFT JOIN teacher_classes tc ON c.id = tc.class_id
        WHERE tc.teacher_id = ? OR c.teacher_id = ?
        ORDER BY c.class_name ASC
    ");
    $stmt->execute([$teacherId, $teacherId]);
    $classes = $stmt->fetchAll();

    echo json_encode($classes ? $classes : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
