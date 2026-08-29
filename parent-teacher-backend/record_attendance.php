<?php
// Include database configuration and token validation middleware
require_once 'config.php';
require_once 'auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

// Security check: Only teachers are authorized to record attendance logs
if ($currentUser['role'] !== 'teacher') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only teachers can record attendance."]);
    exit();
}

// Read raw JSON data from the request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$studentId      = isset($data['student_id']) ? intval($data['student_id']) : 0;
$classId        = isset($data['class_id']) ? intval($data['class_id']) : 0;
$attendanceDate = isset($data['attendance_date']) ? trim($data['attendance_date']) : '';
$status         = isset($data['status']) ? trim($data['status']) : '';
$remarks        = isset($data['remarks']) ? trim($data['remarks']) : null;

// Validate parameters
if ($studentId <= 0 || $classId <= 0 || empty($attendanceDate) || empty($status)) {
    http_response_code(400);
    echo json_encode(["error" => "Please include student_id, class_id, attendance_date, and status in JSON format"]);
    exit();
}

try {
    // 1. Check if an attendance log already exists for this student on this date
    $checkStmt = $pdo->prepare("SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ?");
    $checkStmt->execute([$studentId, $attendanceDate]);
    $existingRecord = $checkStmt->fetch();

    if ($existingRecord) {
        // 2. If it exists, UPDATE the record (recorded_by references teacher_id)
        $updateStmt = $pdo->prepare("
            UPDATE attendance 
            SET status = ?, remarks = ?, recorded_by = ? 
            WHERE id = ?
        ");
        $updateStmt->execute([$status, $remarks, $currentUser['teacher_id'], $existingRecord['id']]);
        
        echo json_encode(["message" => "Attendance record updated successfully"]);
    } else {
        // 3. If it doesn't exist, INSERT a new record
        $insertStmt = $pdo->prepare("
            INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks, recorded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([$studentId, $classId, $attendanceDate, $status, $remarks, $currentUser['teacher_id']]);
        
        echo json_encode(["message" => "Attendance record created successfully"]);
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
    exit();
}
