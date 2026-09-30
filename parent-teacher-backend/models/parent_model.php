<?php
// ============================================================
// Parent Model Functions
// File: parent-teacher-backend/models/parent_model.php
// Description: Reusable database functions for `parents` and `parent_students` tables.
// ============================================================

/**
 * Finds a parent profile record by the linked user ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Linked user account ID
 * @return array|false Parent profile associative array or false
 */
function findParentByUserId($pdo, $userId) {
    $phoneCol = function_exists('getUserPhoneSelect') ? getUserPhoneSelect($pdo) : 'phone as phone_number';
    $stmt = $pdo->prepare("
        SELECT p.*, u.full_name, u.email, {$phoneCol} 
        FROM parents p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
    ");
    $stmt->execute([(int)$userId]);
    return $stmt->fetch();
}

/**
 * Creates or fetches a parent record for a given user ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Linked user account ID
 * @param string|null $occupation Parent occupation
 * @param string|null $address Home address
 * @param string|null $emergencyContact Emergency phone number
 * @return int Parent table primary key ID
 */
function getOrCreateParentId($pdo, $userId, $occupation = null, $address = null, $emergencyContact = null) {
    $parent = findParentByUserId($pdo, $userId);
    if ($parent) {
        return (int)$parent['id'];
    }

    $stmt = $pdo->prepare("
        INSERT INTO parents (user_id, occupation, address, emergency_contact) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([(int)$userId, $occupation, $address, $emergencyContact]);
    return (int)$pdo->lastInsertId();
}

/**
 * Fetches all active students linked to a specific parent.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $parentId Parent table primary key ID
 * @return array List of linked student records with class details
 */
if (!function_exists('getLinkedStudentsForParent')) {
    function getLinkedStudentsForParent($pdo, $parentId) {
    // Dynamic admission_number handling
    $hasAdmCol = false;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'admission_number'")->fetch();
        if ($colCheck) $hasAdmCol = true;
    } catch (Exception $e) {}

    $admSelect = $hasAdmCol ? "s.admission_number" : "CONCAT('STU-2026-0', s.id) as admission_number";
    $relColCheck = $pdo->query("SHOW COLUMNS FROM `parent_students` LIKE 'relationship_type'")->fetch();
    $relCol = $relColCheck ? "ps.relationship_type" : "ps.relationship as relationship_type";
    $nameColCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'full_name'")->fetch();
    $nameSelect = $nameColCheck ? "s.full_name" : "TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as full_name";

    $stmt = $pdo->prepare("
        SELECT 
            s.id,
            {$admSelect},
            {$nameSelect},
            s.date_of_birth,
            s.gender,
            s.class_id,
            c.class_name,
            {$relCol}
        FROM parent_students ps
        JOIN students s ON ps.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE ps.parent_id = ? AND s.status = 'active'
        ORDER BY s.id ASC
    ");
    $stmt->execute([(int)$parentId]);
    return $stmt->fetchAll();
    }
}

/**
 * Links a parent to a student in the `parent_students` junction table.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $parentId Parent table primary key ID
 * @param int $studentId Student table primary key ID
 * @param string $relationshipType Relationship ('father', 'mother', 'guardian')
 * @return bool True on success
 */
function linkParentToStudent($pdo, $parentId, $studentId, $relationshipType = 'guardian') {
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO parent_students (parent_id, student_id, relationship_type) 
        VALUES (?, ?, ?)
    ");
    return $stmt->execute([(int)$parentId, (int)$studentId, $relationshipType]);
}

/**
 * Verifies if a parent is authorized to view/access a student's data.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $parentId Parent table primary key ID
 * @param int $studentId Student table primary key ID
 * @return bool True if linked, false otherwise
 */
function verifyParentStudentRelationship($pdo, $parentId, $studentId) {
    $stmt = $pdo->prepare("
        SELECT id FROM parent_students 
        WHERE parent_id = ? AND student_id = ?
    ");
    $stmt->execute([(int)$parentId, (int)$studentId]);
    return (bool)$stmt->fetch();
}
