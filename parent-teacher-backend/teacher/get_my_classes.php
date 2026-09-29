<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

try {
    $userId = (int)$currentUser['id'];

    // Find or auto-create teacher primary key ID for this user
    $tStmt = $pdo->prepare("SELECT id FROM teachers WHERE user_id = ?");
    $tStmt->execute([$userId]);
    $teacher = $tStmt->fetch();

    if (!$teacher) {
        $insT = $pdo->prepare("INSERT INTO teachers (user_id, status) VALUES (?, 'active')");
        $insT->execute([$userId]);
        $teacherId = (int)$pdo->lastInsertId();
    } else {
        $teacherId = (int)$teacher['id'];
    }

    // Fetch classes assigned to this teacher via teacher_classes or homeroom in classes
    $stmt = $pdo->prepare("
        SELECT DISTINCT 
            c.id, 
            c.class_name, 
            COALESCE(c.grade_level, 1) as grade_level,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND (s.status = 'active' OR s.status IS NULL)) as student_count
        FROM classes c
        LEFT JOIN teacher_classes tc ON c.id = tc.class_id
        WHERE tc.teacher_id = ? OR c.teacher_id = ?
        ORDER BY c.class_name ASC
    ");
    $stmt->execute([$teacherId, $teacherId]);
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // If teacher has no specific class assigned yet, return all active school classes so teacher can manage streams
    if (empty($classes)) {
        $allStmt = $pdo->query("
            SELECT DISTINCT 
                c.id, 
                c.class_name, 
                COALESCE(c.grade_level, 1) as grade_level,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND (s.status = 'active' OR s.status IS NULL)) as student_count
            FROM classes c
            ORDER BY c.class_name ASC
        ");
        $classes = $allStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode($classes ? $classes : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
