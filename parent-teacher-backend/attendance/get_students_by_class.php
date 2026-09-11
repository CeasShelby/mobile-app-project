<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

$classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;
$date    = isset($_GET['date']) ? trim($_GET['date']) : date('Y-m-d');

if ($classId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide a valid class_id query parameter"]);
    exit();
}

try {
    // Fetch students enrolled in this class along with their attendance status for specified date
    $stmt = $pdo->prepare("
        SELECT 
            s.id,
            COALESCE(s.admission_number, s.student_number) as admission_number,
            TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as full_name,
            s.gender,
            s.class_id,
            c.class_name,
            COALESCE(a.status, 'present') as today_status,
            COALESCE(a.remarks, '') as today_remarks,
            a.id as attendance_record_id
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
        WHERE s.class_id = ? AND s.status = 'active'
        ORDER BY s.first_name ASC, s.last_name ASC
    ");
    $stmt->execute([$date, $classId]);
    $students = $stmt->fetchAll();

    echo json_encode($students ? $students : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
