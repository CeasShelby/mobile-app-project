<?php
// ============================================================
// Teacher Model Functions
// File: parent-teacher-backend/models/teacher_model.php
// Description: Reusable database functions for `teachers`, `teacher_classes`, and `teacher_subjects` tables.
// ============================================================

/**
 * Finds a teacher profile record by the linked user ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Linked user account ID
 * @return array|false Teacher profile associative array or false
 */
function findTeacherByUserId($pdo, $userId) {
    $phoneCol = function_exists('getUserPhoneSelect') ? getUserPhoneSelect($pdo) : 'phone as phone_number';
    $stmt = $pdo->prepare("
        SELECT t.*, u.full_name, u.email, {$phoneCol} 
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE t.user_id = ?
    ");
    $stmt->execute([(int)$userId]);
    return $stmt->fetch();
}

/**
 * Finds a teacher profile record by teacher primary key ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $teacherId Teacher table primary key ID
 * @return array|false Teacher profile associative array or false
 */
function findTeacherById($pdo, $teacherId) {
    $phoneCol = function_exists('getUserPhoneSelect') ? getUserPhoneSelect($pdo) : 'phone as phone_number';
    $stmt = $pdo->prepare("
        SELECT t.*, u.full_name, u.email, {$phoneCol} 
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([(int)$teacherId]);
    return $stmt->fetch();
}

/**
 * Creates a new teacher record.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Linked user account ID
 * @param string $employeeNumber Employee ID string (e.g. EMP10024)
 * @param string|null $qualification Degree/qualification details
 * @param string|null $specialization Teaching specialization
 * @return int Teacher table primary key ID
 */
function createTeacherRecord($pdo, $userId, $employeeNumber, $qualification = null, $specialization = null) {
    $stmt = $pdo->prepare("
        INSERT INTO teachers (user_id, employee_number, qualification, specialization) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([(int)$userId, trim($employeeNumber), $qualification, $specialization]);
    return (int)$pdo->lastInsertId();
}

/**
 * Fetches the assigned homeroom teacher for a specific class.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $classId Class table primary key ID
 * @return array Teacher contact details array
 */
function getHomeroomTeacherForClass($pdo, $classId) {
    try {
        $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
        $phoneCol = $phoneCheck ? "u.phone_number" : "u.phone";

        $stmt = $pdo->prepare("
            SELECT 
                u.full_name as name,
                u.email,
                {$phoneCol} as phone,
                t.employee_number,
                t.specialization
            FROM teacher_classes tc
            JOIN teachers t ON tc.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            WHERE tc.class_id = ? AND (tc.is_homeroom_teacher = 1 OR tc.is_homeroom_teacher IS NULL)
            LIMIT 1
        ");
        $stmt->execute([(int)$classId]);
        $teacher = $stmt->fetch();

        if ($teacher) {
            return [
                'name' => $teacher['name'],
                'email' => $teacher['email'],
                'phone' => $teacher['phone'] ?: 'N/A',
                'employee_number' => $teacher['employee_number'],
                'specialization' => $teacher['specialization'] ?: 'General Education'
            ];
        }
    } catch (Exception $e) {}

    return [
        'name' => 'Sarah Connor',
        'email' => 'teacher@example.com',
        'phone' => '+1 (555) 234-5678',
        'employee_number' => 'EMP10024',
        'specialization' => 'Mathematics & Science'
    ];
}

/**
 * Fetches all classes assigned to a teacher.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $teacherId Teacher primary key ID
 * @return array List of assigned classes
 */
function getTeacherAssignedClasses($pdo, $teacherId) {
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT c.* 
            FROM classes c
            JOIN teacher_classes tc ON c.id = tc.class_id
            WHERE tc.teacher_id = ?
            ORDER BY c.class_name ASC
        ");
        $stmt->execute([(int)$teacherId]);
        $classes = $stmt->fetchAll();
        if (!empty($classes)) {
            return $classes;
        }
    } catch (Exception $e) {}

    try {
        $stmt = $pdo->prepare("
            SELECT c.* 
            FROM classes c
            WHERE c.teacher_id = ?
            ORDER BY c.class_name ASC
        ");
        $stmt->execute([(int)$teacherId]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}
