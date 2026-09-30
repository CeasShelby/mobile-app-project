<?php
// ============================================================
// Academic Progress Model Functions
// File: parent-teacher-backend/models/progress_model.php
// Description: Reusable database functions for the `student_progress` table.
// ============================================================

/**
 * Fetches academic evaluation marks and progress records for a student.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId Student primary key ID
 * @param int|null $subjectId Optional filter by subject ID
 * @return array List of academic progress records
 */
function getStudentProgress($pdo, $studentId, $subjectId = null) {
    // Dynamic column checks for student_progress table compatibility
    $marksCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'marks_obtained'")->fetch();
    $marksCol = $marksCheck ? "sp.marks_obtained as marks" : "sp.marks";

    $totalMarksCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'total_marks'")->fetch();
    $totalMarksCol = $totalMarksCheck ? "sp.total_marks as max_marks" : "100.00 as max_marks";

    $titleCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'assessment_name'")->fetch();
    $titleCol = $titleCheck ? "sp.assessment_name as assessment_title" : "IFNULL(a.title, 'Subject Evaluation') as assessment_title";

    $typeCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'assessment_type'")->fetch();
    $typeCol = $typeCheck ? "sp.assessment_type" : "IFNULL(a.assessment_type, 'quiz') as assessment_type";

    $dateCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'assessment_date'")->fetch();
    $dateSelect = $dateCheck ? "sp.assessment_date as date_recorded" : "sp.date_recorded";
    $dateOrder = $dateCheck ? "sp.assessment_date" : "sp.date_recorded";

    $remarksCheck = $pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'remarks'")->fetch();
    $remarksCol = $remarksCheck ? "sp.remarks as comments" : "sp.comments";

    $sql = "
        SELECT 
            sp.id,
            {$marksCol},
            {$totalMarksCol},
            sp.grade,
            {$remarksCol},
            {$dateSelect},
            sub.subject_name,
            sub.subject_code,
            {$titleCol},
            {$typeCol}
        FROM student_progress sp
        JOIN subjects sub ON sp.subject_id = sub.id
        LEFT JOIN assessments a ON sp.assessment_id = a.id
        WHERE sp.student_id = ?
    ";

    $params = [(int)$studentId];
    if ($subjectId) {
        $sql .= " AND sp.subject_id = ?";
        $params[] = (int)$subjectId;
    }

    $sql .= " ORDER BY {$dateOrder} DESC, sp.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $records = $stmt->fetchAll();

    if (empty($records)) {
        return [];
    }

    return array_map(function($rec) {
        return [
            'id' => (int)$rec['id'],
            'subject_name' => $rec['subject_name'],
            'subject_code' => $rec['subject_code'],
            'marks' => (float)$rec['marks'],
            'max_marks' => (float)($rec['max_marks'] ?: 100.00),
            'grade' => $rec['grade'] ?: 'N/A',
            'comments' => $rec['comments'] ?: 'No comments logged',
            'date_recorded' => $rec['date_recorded'],
            'assessment_title' => $rec['assessment_title'] ?: 'Subject Evaluation',
            'assessment_type' => $rec['assessment_type'] ?: 'quiz'
        ];
    }, $records);
}

/**
 * Calculates academic summary statistics (overall average percentage, evaluation count).
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId Student primary key ID
 * @return array Academic overall summary stats
 */
function getStudentAcademicSummary($pdo, $studentId) {
    $records = getStudentProgress($pdo, $studentId);
    $totalMarks = 0;
    $totalCount = count($records);

    foreach ($records as $rec) {
        $totalMarks += (float)$rec['marks'];
    }

    $overallAverage = $totalCount > 0 ? round($totalMarks / $totalCount, 1) : 0.0;

    return [
        'overall_average' => $overallAverage,
        'total_assessments' => $totalCount,
        'records' => $records
    ];
}

/**
 * Inserts a new academic evaluation mark record for a student.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId Student ID
 * @param int $subjectId Subject ID
 * @param float $marks Score achieved
 * @param string $grade Letter grade (A, B, C...)
 * @param string|null $comments Teacher feedback
 * @param int|null $recordedBy Teacher ID
 * @param string $assessmentName Title of evaluation
 * @param string $assessmentType Type ('exam', 'quiz', 'homework', 'project')
 * @return int Newly created progress record ID
 */
function recordStudentProgress($pdo, $studentId, $subjectId, $marks, $grade, $comments = null, $recordedBy = null, $assessmentName = 'Subject Assessment', $assessmentType = 'quiz') {
    $hasMarksObtained = (bool)$pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'marks_obtained'")->fetch();
    $marksField = $hasMarksObtained ? 'marks_obtained' : 'marks';

    $hasRemarks = (bool)$pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'remarks'")->fetch();
    $remarksField = $hasRemarks ? 'remarks' : 'comments';

    $hasTeacherId = (bool)$pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'teacher_id'")->fetch();
    $teacherField = $hasTeacherId ? 'teacher_id' : 'recorded_by';

    $hasAssessmentName = (bool)$pdo->query("SHOW COLUMNS FROM `student_progress` LIKE 'assessment_name'")->fetch();
    
    if ($hasAssessmentName) {
        $stmt = $pdo->prepare("
            INSERT INTO student_progress (student_id, subject_id, {$marksField}, grade, {$remarksField}, {$teacherField}, assessment_name, assessment_type, assessment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
        ");
        $stmt->execute([
            (int)$studentId,
            (int)$subjectId,
            (float)$marks,
            strtoupper(trim($grade)),
            $comments,
            $recordedBy ? (int)$recordedBy : null,
            $assessmentName,
            $assessmentType
        ]);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO student_progress (student_id, subject_id, {$marksField}, grade, {$remarksField}, {$teacherField}, date_recorded) 
            VALUES (?, ?, ?, ?, ?, ?, CURDATE())
        ");
        $stmt->execute([
            (int)$studentId,
            (int)$subjectId,
            (float)$marks,
            strtoupper(trim($grade)),
            $comments,
            $recordedBy ? (int)$recordedBy : null
        ]);
    }

    return (int)$pdo->lastInsertId();
}
