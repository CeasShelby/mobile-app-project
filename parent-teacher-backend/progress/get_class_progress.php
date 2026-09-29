<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

$classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;

if ($classId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide a valid class_id query parameter"]);
    exit();
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            sp.id,
            sp.student_id,
            COALESCE(NULLIF(s.full_name, ''), TRIM(CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,''))), 'Student') as student_name,
            sub.subject_name,
            sub.subject_code,
            sp.assessment_name,
            sp.assessment_type,
            sp.marks_obtained,
            sp.total_marks,
            sp.grade,
            sp.remarks,
            sp.assessment_date
        FROM student_progress sp
        JOIN students s ON sp.student_id = s.id
        JOIN subjects sub ON sp.subject_id = sub.id
        WHERE s.class_id = ?
        ORDER BY sp.id DESC
        LIMIT 30
    ");
    $stmt->execute([$classId]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($records ? $records : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
