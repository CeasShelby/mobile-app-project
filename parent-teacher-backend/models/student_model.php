<?php
// ============================================================
// Student Model Functions
// File: parent-teacher-backend/models/student_model.php
// Description: Reusable database helper functions for the `students` table.
// ============================================================

/**
 * Finds a student record by unique student ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId Student primary key ID
 * @return array|false Student profile associative array or false
 */
function findStudentById($pdo, $studentId) {
    $hasAdmCol = false;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'admission_number'")->fetch();
        if ($colCheck) $hasAdmCol = true;
    } catch (Exception $e) {}

    $admSelect = $hasAdmCol ? "s.admission_number" : (
        $pdo->query("SHOW COLUMNS FROM `students` LIKE 'student_number'")->fetch() ? "s.student_number as admission_number" : "CONCAT('STU-2026-0', s.id) as admission_number"
    );

    $nameColCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'full_name'")->fetch();
    $nameSelect = $nameColCheck ? "s.full_name" : "TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as full_name";

    $gradeColCheck = $pdo->query("SHOW COLUMNS FROM `classes` LIKE 'grade_level'")->fetch();
    $gradeSelect = $gradeColCheck ? "c.grade_level" : "c.class_level as grade_level";

    $stmt = $pdo->prepare("
        SELECT 
            s.id,
            {$admSelect},
            {$nameSelect},
            s.date_of_birth,
            s.gender,
            s.status,
            s.class_id,
            s.combination,
            c.class_name,
            {$gradeSelect}
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = ?
    ");
    $stmt->execute([(int)$studentId]);
    return $stmt->fetch();
}

/**
 * Fetches all student records in the school database.
 *
 * @param PDO $pdo Active database connection instance
 * @return array List of all student records
 */
function getAllStudents($pdo) {
    $stmt = $pdo->query("
        SELECT s.*, c.class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        ORDER BY s.id ASC
    ");
    return $stmt->fetchAll();
}

/**
 * Fetches all active students enrolled in a specific class.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $classId Class primary key ID
 * @return array List of student records enrolled in class
 */
function getStudentsByClassId($pdo, $classId) {
    $stmt = $pdo->prepare("
        SELECT s.*, c.class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.class_id = ? AND s.status = 'active'
        ORDER BY s.full_name ASC
    ");
    $stmt->execute([(int)$classId]);
    return $stmt->fetchAll();
}

/**
 * Creates a new student record in the database.
 *
 * @param PDO $pdo Active database connection instance
 * @param string $admissionNumber Unique student registration number
 * @param string $fullName Student's full name
 * @param string $dateOfBirth Date of birth (YYYY-MM-DD)
 * @param string $gender Student gender ('male', 'female', 'other')
 * @param int|null $classId Assigned class ID
 * @return int Newly created student ID
 */
function createStudentRecord($pdo, $admissionNumber, $fullName, $dateOfBirth, $gender, $classId = null) {
    $stmt = $pdo->prepare("
        INSERT INTO students (admission_number, full_name, date_of_birth, gender, class_id, status) 
        VALUES (?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([
        trim($admissionNumber),
        trim($fullName),
        $dateOfBirth,
        strtolower($gender),
        $classId ? (int)$classId : null
    ]);
    return (int)$pdo->lastInsertId();
}

/**
 * Updates a student's class assignment or personal details.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId Target student ID
 * @param string $fullName Updated full name
 * @param int|null $classId Updated class ID
 * @param string $status Updated status ('active', 'graduated', 'transferred')
 * @return bool True on success
 */
function updateStudentRecord($pdo, $studentId, $fullName, $classId = null, $status = 'active') {
    $stmt = $pdo->prepare("
        UPDATE students 
        SET full_name = ?, class_id = ?, status = ? 
        WHERE id = ?
    ");
    return $stmt->execute([trim($fullName), $classId ? (int)$classId : null, $status, (int)$studentId]);
}
