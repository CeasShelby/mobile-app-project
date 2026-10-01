<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth_middleware.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

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
            COALESCE(s.admission_number, CONCAT('STU-', s.id)) as admission_number,
            COALESCE(NULLIF(s.full_name, ''), TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))), 'Student') as full_name,
            s.gender,
            s.class_id,
            c.class_name,
            COALESCE(LOWER(a.status), 'present') as today_status,
            COALESCE(a.remarks, '') as today_remarks,
            a.id as attendance_record_id
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
        WHERE s.class_id = ? AND (s.status = 'active' OR s.status IS NULL)
        ORDER BY s.full_name ASC
    ");
    $stmt->execute([$date, $classId]);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($students ? $students : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
