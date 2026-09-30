<?php
// ============================================================
// Student Model Functions
// File: parent-teacher-backend/models/student_model.php
//
// 🎯 WHY THIS FILE EXISTS:
// Centralizes all database functions for managing student records, linked children,
// class assignments, and guardian relationships.
//
// 💡 WHAT IT DOES:
// Queries linked children for parents, lists class rosters for teachers,
// creates new student admission records, and fetches comprehensive profile data.
//
// ⚙️ HOW IT WORKS:
// Uses SQL JOINs across `students`, `classes`, and `parent_students` tables
// executed via PDO Prepared Statements for fast, secure relational data retrieval.
// ============================================================

/**
 * Fetches all student records linked to a specific parent guardian.
 *
 * WHY: Parent Dashboard needs to display linked children cards and stats.
 * WHAT: Relational SQL JOIN linking students, parent_students, and classes.
 * HOW: Filters by ps.parent_id = ? and returns array of linked child records.
 */
if (!function_exists('getLinkedStudentsForParent')) {
    function getLinkedStudentsForParent($pdo, $parentId) {
        // 1. HOW: Prepare multi-table SQL JOIN query
        $stmt = $pdo->prepare("
            SELECT 
                s.id, s.admission_number, s.full_name, s.class_id, s.status,
                c.class_name, c.grade_level, ps.relationship_type
            FROM students s
            JOIN parent_students ps ON s.id = ps.student_id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE ps.parent_id = ? AND (s.status = 'active' OR s.status IS NULL)
            ORDER BY s.full_name ASC
        ");
        // 2. HOW: Bind parent ID safely and execute
        $stmt->execute([(int)$parentId]);
        // 3. WHAT: Return array of linked student records
        return $stmt->fetchAll();
    }
}

/**
 * Fetches single student record with class name.
 *
 * WHY: Profile view & roll call verification.
 * WHAT: Retrieves student details by primary key student ID.
 * HOW: Returns single student row as associative array.
 */
function getStudentById($pdo, $studentId) {
    $stmt = $pdo->prepare("
        SELECT 
            s.*, 
            c.class_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = ?
    ");
    $stmt->execute([(int)$studentId]);
    return $stmt->fetch();
}

/**
 * Fetches all active student records in the school database.
 *
 * WHY: Admin student management directory.
 * WHAT: Returns all student records sorted alphabetically.
 * HOW: Executes query and returns array via fetchAll().
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
 * Creates a new student record.
 *
 * WHY: Enrolls a new student into the school portal system.
 * WHAT: Inserts full_name, admission_number, class_id, and guardian details.
 * HOW: Returns newly created student primary key integer ID.
 */
function createStudent($pdo, $fullName, $admissionNumber, $classId = null, $gender = null, $dob = null) {
    $stmt = $pdo->prepare("
        INSERT INTO students (full_name, admission_number, class_id, gender, date_of_birth, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([
        trim($fullName),
        trim($admissionNumber),
        $classId ? (int)$classId : null,
        $gender,
        $dob
    ]);
    return (int)$pdo->lastInsertId();
}

/**
 * Links a student to a parent guardian record.
 *
 * WHY: Junction table `parent_students` mapping parent to child.
 * WHAT: Inserts (parent_id, student_id, relationship_type) tuple.
 * HOW: Uses INSERT IGNORE to prevent duplicate relationship records.
 */
function linkStudentToParent($pdo, $parentId, $studentId, $relationshipType = 'parent') {
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO parent_students (parent_id, student_id, relationship_type)
        VALUES (?, ?, ?)
    ");
    return $stmt->execute([(int)$parentId, (int)$studentId, $relationshipType]);
}
