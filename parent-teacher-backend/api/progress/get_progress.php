<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

$studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;

// If student_id is not provided and user is parent, find parent's first child
if ($studentId <= 0 && $currentUser['role'] === 'parent') {
    $cStmt = $pdo->prepare("
        SELECT ps.student_id 
        FROM parent_students ps 
        JOIN parents p ON ps.parent_id = p.id 
        WHERE p.user_id = ? 
        LIMIT 1
    ");
    $cStmt->execute([$currentUser['id']]);
    $child = $cStmt->fetch();
    if ($child) {
        $studentId = (int)$child['student_id'];
    }
}

if ($studentId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide a valid student_id query parameter"]);
    exit();
}

try {
    // Fetch progress records with subject and teacher details
    $stmt = $pdo->prepare("
        SELECT 
            sp.id,
            sp.student_id,
            sp.subject_id,
            sub.subject_name,
            sub.subject_code,
            sp.assessment_name,
            sp.assessment_type,
            sp.marks_obtained,
            sp.total_marks,
            sp.grade,
            sp.remarks,
            sp.assessment_date,
            u.full_name AS teacher_name,
            u.id AS teacher_user_id
        FROM student_progress sp
        JOIN subjects sub ON sp.subject_id = sub.id
        LEFT JOIN teachers t ON sp.teacher_id = t.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE sp.student_id = ?
        ORDER BY sp.assessment_date DESC, sp.id DESC
    ");
    $stmt->execute([$studentId]);
    $progressRecords = $stmt->fetchAll();

    echo json_encode($progressRecords ? $progressRecords : []);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}
