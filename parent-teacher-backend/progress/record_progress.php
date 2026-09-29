<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

if ($currentUser['role'] !== 'teacher') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only teachers can record student progress."]);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$studentId      = isset($data['student_id']) ? intval($data['student_id']) : 0;
$subjectId      = isset($data['subject_id']) ? intval($data['subject_id']) : 0;
$assessmentName = isset($data['assessment_name']) ? trim($data['assessment_name']) : 'Assessment';
$assessmentType = isset($data['assessment_type']) ? trim($data['assessment_type']) : 'Exam';
$marksObtained  = isset($data['marks_obtained']) ? floatval($data['marks_obtained']) : 0.0;
$totalMarks     = isset($data['total_marks']) ? floatval($data['total_marks']) : 100.0;
$remarks        = isset($data['remarks']) ? trim($data['remarks']) : null;
$assessmentDate = isset($data['assessment_date']) ? trim($data['assessment_date']) : date('Y-m-d');

if ($studentId <= 0 || $subjectId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please include valid student_id and subject_id in JSON format"]);
    exit();
}

try {
    // Resolve teacher ID dynamically for current user
    $userId = (int)$currentUser['id'];
    $tRow = $pdo->prepare("SELECT id FROM teachers WHERE user_id = ?");
    $tRow->execute([$userId]);
    $tFetch = $tRow->fetch();

    if (!$tFetch) {
        $insT = $pdo->prepare("INSERT INTO teachers (user_id, status) VALUES (?, 'active')");
        $insT->execute([$userId]);
        $teacherId = (int)$pdo->lastInsertId();
    } else {
        $teacherId = (int)$tFetch['id'];
    }

    // Fetch student class level to apply Ugandan O'Level (UCE) or A'Level (UACE) grading scale
    $cLevelStmt = $pdo->prepare("
        SELECT c.class_name, COALESCE(c.grade_level, 1) as grade_level 
        FROM students s 
        LEFT JOIN classes c ON s.class_id = c.id 
        WHERE s.id = ?
    ");
    $cLevelStmt->execute([$studentId]);
    $cLevelRow = $cLevelStmt->fetch();
    $gradeLevel = $cLevelRow ? (int)$cLevelRow['grade_level'] : 1;
    $isALevel   = ($gradeLevel >= 5);

    // Calculate UNEB Grade
    $pct = ($totalMarks > 0) ? ($marksObtained / $totalMarks) * 100 : 0;
    $grade = 'F';

    if ($isALevel) {
        if ($pct >= 80) $grade = 'A';
        elseif ($pct >= 70) $grade = 'B';
        elseif ($pct >= 60) $grade = 'C';
        elseif ($pct >= 50) $grade = 'D';
        elseif ($pct >= 40) $grade = 'E';
        elseif ($pct >= 35) $grade = 'O';
        else $grade = 'F';
    } else {
        if ($pct >= 80) $grade = 'D1';
        elseif ($pct >= 75) $grade = 'D2';
        elseif ($pct >= 66) $grade = 'C3';
        elseif ($pct >= 60) $grade = 'C4';
        elseif ($pct >= 55) $grade = 'C5';
        elseif ($pct >= 50) $grade = 'C6';
        elseif ($pct >= 45) $grade = 'P7';
        elseif ($pct >= 40) $grade = 'P8';
        else $grade = 'F9';
    }

    // Insert new progress assessment record
    $stmt = $pdo->prepare("
        INSERT INTO student_progress 
            (student_id, subject_id, teacher_id, assessment_name, assessment_type, marks_obtained, total_marks, grade, remarks, assessment_date)
        VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $studentId,
        $subjectId,
        $teacherId,
        $assessmentName,
        $assessmentType,
        $marksObtained,
        $totalMarks,
        $grade,
        $remarks,
        $assessmentDate
    ]);

    $newId = (int)$pdo->lastInsertId();

    // Trigger notification to parents of this student
    try {
        $parentStmt = $pdo->prepare("
            SELECT p.user_id 
            FROM parent_students ps 
            JOIN parents p ON ps.parent_id = p.id 
            WHERE ps.student_id = ?
        ");
        $parentStmt->execute([$studentId]);
        $parents = $parentStmt->fetchAll(PDO::FETCH_ASSOC);

        $stuStmt = $pdo->prepare("SELECT full_name FROM students WHERE id = ?");
        $stuStmt->execute([$studentId]);
        $studentObj = $stuStmt->fetch();
        $studentName = $studentObj ? $studentObj['full_name'] : 'Child';

        $subStmt = $pdo->prepare("SELECT subject_name FROM subjects WHERE id = ?");
        $subStmt->execute([$subjectId]);
        $subObj = $subStmt->fetch();
        $subjectName = $subObj ? $subObj['subject_name'] : 'Subject';

        $notifIns = $pdo->prepare("
            INSERT INTO notifications (recipient_id, type, title, message, payload_json, is_read) 
            VALUES (?, 'result', ?, ?, ?, 0)
        ");

        $title = "New Academic Score Posted: {$studentName}";
        $msg   = "{$studentName} scored {$marksObtained}/{$totalMarks} ({$grade}) in {$subjectName} ({$assessmentName}).";
        $payload = json_encode([
            'student_id' => $studentId,
            'progress_id' => $newId,
            'grade' => $grade,
            'subject_name' => $subjectName
        ]);

        foreach ($parents as $pr) {
            $notifIns->execute([(int)$pr['user_id'], $title, $msg, $payload]);
        }
    } catch (\Exception $notifErr) {
        error_log("Failed to dispatch progress notification: " . $notifErr->getMessage());
    }

    echo json_encode([
        "success" => true,
        "message" => "Student progress score recorded successfully",
        "id" => $newId,
        "calculated_grade" => $grade
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database insertion failed: " . $e->getMessage()]);
}
