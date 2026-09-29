<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json');

// 1. Authenticate Request
$currentUser = authenticate_request();

// 2. Authorize: Only teachers can record attendance
if ($currentUser['role'] !== 'teacher') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only teachers can record attendance."]);
    exit();
}

// 3. Read JSON Payload
$input = file_get_contents('php://input');
$data  = json_decode($input, true);

$classId        = isset($data['class_id']) ? intval($data['class_id']) : 0;
$attendanceDate = isset($data['attendance_date']) ? trim($data['attendance_date']) : date('Y-m-d');
$records        = isset($data['records']) && is_array($data['records']) ? $data['records'] : [];

if ($classId <= 0 || empty($records)) {
    http_response_code(400);
    echo json_encode(["error" => "Please provide class_id, attendance_date, and non-empty records array."]);
    exit();
}

try {
    // Resolve teacher primary key ID for current authenticated user
    $userId = (int)$currentUser['id'];
    $tStmt  = $pdo->prepare("SELECT id FROM teachers WHERE user_id = ?");
    $tStmt->execute([$userId]);
    $teacher = $tStmt->fetch();

    if (!$teacher) {
        $insT = $pdo->prepare("INSERT INTO teachers (user_id, status) VALUES (?, 'active')");
        $insT->execute([$userId]);
        $teacherId = (int)$pdo->lastInsertId();
    } else {
        $teacherId = (int)$teacher['id'];
    }

    // Begin Database Transaction for Atomic Batch Save
    $pdo->beginTransaction();

    $checkStmt  = $pdo->prepare("SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ?");
    $updateStmt = $pdo->prepare("UPDATE attendance SET status = ?, remarks = ?, recorded_by = ? WHERE id = ?");
    $insertStmt = $pdo->prepare("INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks, recorded_by) VALUES (?, ?, ?, ?, ?, ?)");

    $savedCount = 0;
    $absentOrLateLogs = [];

    foreach ($records as $rec) {
        $studentId = isset($rec['student_id']) ? intval($rec['student_id']) : 0;
        $status    = isset($rec['status']) ? strtolower(trim($rec['status'])) : 'present';
        $remarks   = isset($rec['remarks']) && !empty(trim($rec['remarks'])) ? trim($rec['remarks']) : null;

        if ($studentId <= 0) continue;

        // Check if attendance entry already exists for this student on this date
        $checkStmt->execute([$studentId, $attendanceDate]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            $updateStmt->execute([$status, $remarks, $teacherId, (int)$existing['id']]);
        } else {
            $insertStmt->execute([$studentId, $classId, $attendanceDate, $status, $remarks, $teacherId]);
        }

        $savedCount++;

        // Track absent/late records for automatic notification dispatch
        if (in_array($status, ['absent', 'late'])) {
            $absentOrLateLogs[] = [
                'student_id' => $studentId,
                'status' => $status,
                'remarks' => $remarks
            ];
        }
    }

    $pdo->commit();

    // Send push notification alerts to parents for absent/late students
    if (!empty($absentOrLateLogs)) {
        try {
            $clsStmt = $pdo->prepare("SELECT class_name FROM classes WHERE id = ?");
            $clsStmt->execute([$classId]);
            $clsRow = $clsStmt->fetch();
            $className = $clsRow ? $clsRow['class_name'] : 'Class';

            $stuStmt   = $pdo->prepare("SELECT full_name FROM students WHERE id = ?");
            $parentStmt = $pdo->prepare("SELECT p.user_id FROM parent_students ps JOIN parents p ON ps.parent_id = p.id WHERE ps.student_id = ?");
            $notifIns  = $pdo->prepare("INSERT INTO notifications (recipient_id, type, title, message, payload_json, is_read) VALUES (?, 'attendance', ?, ?, ?, 0)");

            foreach ($absentOrLateLogs as $log) {
                $stuStmt->execute([$log['student_id']]);
                $stu = $stuStmt->fetch();
                $studentName = $stu ? $stu['full_name'] : 'Your child';

                $parentStmt->execute([$log['student_id']]);
                $parents = $parentStmt->fetchAll(PDO::FETCH_ASSOC);

                $statusTitle = ucfirst($log['status']);
                $title = "Attendance Alert: {$studentName} marked {$statusTitle}";
                $msg   = "{$studentName} was recorded as {$statusTitle} for {$className} roll-call on {$attendanceDate}.";
                if ($log['remarks']) {
                    $msg .= " Teacher note: \"{$log['remarks']}\".";
                }

                $payload = json_encode([
                    'student_id' => $log['student_id'],
                    'status' => $log['status'],
                    'date' => $attendanceDate
                ]);

                foreach ($parents as $pr) {
                    $notifIns->execute([(int)$pr['user_id'], $title, $msg, $payload]);
                }
            }
        } catch (\Exception $notifErr) {
            error_log("Failed to dispatch attendance notification alerts: " . $notifErr->getMessage());
        }
    }

    echo json_encode([
        "success"     => true,
        "message"     => "Roll-call attendance recorded successfully for {$savedCount} student(s)",
        "saved_count" => $savedCount
    ]);

} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
