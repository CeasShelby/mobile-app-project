<?php
// Include database configuration and token validation middleware from parent directory
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

// Authenticate: Ensure user is logged in
$currentUser = authenticate_request();

// Security check: Only teachers are authorized to record attendance logs
if ($currentUser['role'] !== 'teacher') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only teachers can record attendance."]);
    exit();
}

// Read raw JSON data from request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$studentId      = isset($data['student_id']) ? intval($data['student_id']) : 0;
$classId        = isset($data['class_id']) ? intval($data['class_id']) : 0;
$attendanceDate = isset($data['attendance_date']) ? trim($data['attendance_date']) : date('Y-m-d');
$status         = isset($data['status']) ? ucfirst(strtolower(trim($data['status']))) : 'Present';
$remarks        = isset($data['remarks']) ? trim($data['remarks']) : null;

// Validate parameters
if ($studentId <= 0 || $classId <= 0 || empty($attendanceDate) || empty($status)) {
    http_response_code(400);
    echo json_encode(["error" => "Please include student_id, class_id, attendance_date, and status in JSON format"]);
    exit();
}

try {
    // Resolve teacher ID from JWT payload; look up from DB if not embedded
    $teacherId = isset($currentUser['teacher_id']) && (int)$currentUser['teacher_id'] > 0
        ? (int)$currentUser['teacher_id']
        : null;
    if ($teacherId === null) {
        $tRow = $pdo->prepare("SELECT id FROM teachers WHERE user_id = ?");
        $tRow->execute([(int)$currentUser['id']]);
        $tFetch = $tRow->fetch();
        $teacherId = $tFetch ? (int)$tFetch['id'] : null;
    }

    // 1. Check if an attendance log already exists for this student on this date
    $checkStmt = $pdo->prepare("SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ?");
    $checkStmt->execute([$studentId, $attendanceDate]);
    $existingRecord = $checkStmt->fetch();

    if ($existingRecord) {
        // 2. If it exists, UPDATE the record
        $updateStmt = $pdo->prepare("
            UPDATE attendance 
            SET status = ?, remarks = ?, recorded_by = ? 
            WHERE id = ?
        ");
        $updateStmt->execute([$status, $remarks, $teacherId, $existingRecord['id']]);
    } else {
        // 3. If it doesn't exist, INSERT a new record
        $insertStmt = $pdo->prepare("
            INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks, recorded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([$studentId, $classId, $attendanceDate, $status, $remarks, $teacherId]);
    }

    // 4. Trigger Parent Notification for Absent or Late status (Parent-Teacher Communication)
    if (in_array(strtolower($status), ['absent', 'late'])) {
        // Live DB students uses first_name + last_name (not full_name)
        $pStmt = $pdo->prepare("
            SELECT p.user_id, TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as student_name
            FROM parent_students ps
            JOIN parents p ON ps.parent_id = p.id
            JOIN students s ON ps.student_id = s.id
            WHERE ps.student_id = ?
        ");
        $pStmt->execute([$studentId]);
        $parents = $pStmt->fetchAll();

        foreach ($parents as $parent) {
            $sName = !empty($parent['student_name']) ? trim($parent['student_name']) : "Your child";
            // Live DB notifications: use recipient_id (not user_id)
            $nStmt = $pdo->prepare("
                INSERT INTO notifications (recipient_id, title, message, type, is_read)
                VALUES (?, ?, ?, 'attendance', 0)
            ");
            $nStmt->execute([
                $parent['user_id'],
                "Attendance Alert: {$sName}",
                "{$sName} was marked {$status} for class on {$attendanceDate}." . ($remarks ? " Note: {$remarks}" : "")
            ]);
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Attendance record saved successfully",
        "status"  => $status
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
    exit();
}
