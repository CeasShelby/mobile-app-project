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
$subjectId      = isset($data['subject_id']) ? intval($data['subject_id']) : 1;
$assessmentName = isset($data['assessment_name']) ? trim($data['assessment_name']) : 'Assessment';
$assessmentType = isset($data['assessment_type']) ? trim($data['assessment_type']) : 'Exam';
$marksObtained  = isset($data['marks_obtained']) ? floatval($data['marks_obtained']) : 0.0;
$totalMarks     = isset($data['total_marks']) ? floatval($data['total_marks']) : 100.0;
$remarks        = isset($data['remarks']) ? trim($data['remarks']) : null;
$assessmentDate = isset($data['assessment_date']) ? trim($data['assessment_date']) : date('Y-m-d');

if ($studentId <= 0 || $subjectId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Please include student_id and subject_id in JSON format"]);
    exit();
}

try {
    $teacherId = isset($currentUser['teacher_id']) ? (int)$currentUser['teacher_id'] : 1;

    // Fetch student class level to apply Ugandan O'Level or A'Level grading scale
    $cLevelStmt = $pdo->prepare("
        SELECT c.class_level 
        FROM students s 
        LEFT JOIN classes c ON s.class_id = c.id 
        WHERE s.id = ?
    ");
    $cLevelStmt->execute([$studentId]);
    $cLevelRow = $cLevelStmt->fetch();
    $isALevel = ($cLevelRow && strpos($cLevelRow['class_level'], "A'Level") !== false);

    // Calculate percentage and Ugandan grade
    $pct = ($totalMarks > 0) ? ($marksObtained / $totalMarks) * 100 : 0;
    
    if ($isALevel) {
        // A'Level (UACE) Grade Scale: A, B, C, D, E, O, F
        if ($pct >= 80) $grade = 'A';
        elseif ($pct >= 70) $grade = 'B';
        elseif ($pct >= 60) $grade = 'C';
        elseif ($pct >= 50) $grade = 'D';
        elseif ($pct >= 40) $grade = 'E';
        elseif ($pct >= 35) $grade = 'O';
        else $grade = 'F';
    } else {
        // O'Level (UCE) Grade Scale: D1, D2, C3, C4, C5, C6, P7, P8, F9
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

    // Insert student progress log
    $stmt = $pdo->prepare("
        INSERT INTO student_progress (student_id, subject_id, teacher_id, assessment_name, assessment_type, marks_obtained, total_marks, grade, remarks, assessment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $studentId, $subjectId, $teacherId, $assessmentName, $assessmentType, $marksObtained, $totalMarks, $grade, $remarks, $assessmentDate
    ]);
    $newId = (int)$pdo->lastInsertId();

    // Trigger parent notification
    $pStmt = $pdo->prepare("
        SELECT p.user_id, TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as student_name, sub.subject_name
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        JOIN students s ON ps.student_id = s.id
        JOIN subjects sub ON sub.id = ?
        WHERE ps.student_id = ?
    ");
    $pStmt->execute([$subjectId, $studentId]);
    $parents = $pStmt->fetchAll();

    foreach ($parents as $parent) {
        $sName = !empty($parent['student_name']) ? $parent['student_name'] : "Your child";
        $subName = $parent['subject_name'];
        $nStmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (?, ?, ?, 'progress', 0)
        ");
        $nStmt->execute([
            $parent['user_id'],
            "New Grade Posted: {$subName}",
            "{$sName} scored {$marksObtained}/{$totalMarks} (Grade {$grade}) in {$assessmentName}."
        ]);
    }

    echo json_encode([
        "success" => true,
        "message" => "Secondary grade record created successfully",
        "id"      => $newId,
        "grade"   => $grade
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
