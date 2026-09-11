<?php
// ============================================================
// User Model Functions
// File: parent-teacher-backend/models/user_model.php
// Description: Reusable database helper functions for the `users` table.
// ============================================================

/**
 * Dynamic Helper: Get phone column alias for SQL query compatibility
 */
function getUserPhoneSelect($pdo) {
    try {
        $check = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
        return $check ? "phone_number" : "phone as phone_number";
    } catch (Exception $e) {
        return "phone as phone_number";
    }
}

/**
 * Finds a user account by unique user ID.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId The unique user ID
 * @return array|false User record associative array or false if not found
 */
function findUserById($pdo, $userId) {
    $phoneCol = getUserPhoneSelect($pdo);
    $stmt = $pdo->prepare("
        SELECT id, email, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE id = ?
    ");
    $stmt->execute([(int)$userId]);
    return $stmt->fetch();
}

/**
 * Finds a user account by email address (used during login & auth checks).
 *
 * @param PDO $pdo Active database connection instance
 * @param string $email User email address
 * @return array|false User record with password hash or false if not found
 */
function findUserByEmail($pdo, $email) {
    $phoneCol = getUserPhoneSelect($pdo);
    $stmt = $pdo->prepare("
        SELECT id, email, password, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([trim($email)]);
    return $stmt->fetch();
}

/**
 * Creates a new user record in the `users` table.
 *
 * @param PDO $pdo Active database connection instance
 * @param string $fullName User's full name
 * @param string $email Unique email address
 * @param string $hashedPassword Bcrypt encrypted password string
 * @param string $role User role ('admin', 'teacher', 'parent')
 * @param string|null $phoneNumber Contact phone number
 * @return int Newly created user ID
 */
function createUser($pdo, $fullName, $email, $hashedPassword, $role, $phoneNumber = null) {
    // Check whether phone or phone_number column exists
    $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
    $colName = $phoneCheck ? "phone_number" : "phone";

    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, password, role, {$colName}, status) 
        VALUES (?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([
        trim($fullName),
        trim($email),
        $hashedPassword,
        $role,
        $phoneNumber
    ]);
    return (int)$pdo->lastInsertId();
}

/**
 * Updates a user's password.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Target user ID
 * @param string $newHashedPassword New bcrypt password hash
 * @return bool True on success
 */
function updateUserPassword($pdo, $userId, $newHashedPassword) {
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    return $stmt->execute([$newHashedPassword, (int)$userId]);
}

/**
 * Updates a user's profile details (Name, Phone, Profile Picture).
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Target user ID
 * @param string $fullName Updated full name
 * @param string|null $phoneNumber Updated phone number
 * @param string|null $profilePicture Profile picture filename/URL
 * @return bool True on success
 */
function updateUserProfile($pdo, $userId, $fullName, $phoneNumber = null, $profilePicture = null) {
    $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
    $colName = $phoneCheck ? "phone_number" : "phone";

    $stmt = $pdo->prepare("
        UPDATE users 
        SET full_name = ?, {$colName} = ?, profile_picture = COALESCE(?, profile_picture) 
        WHERE id = ?
    ");
    return $stmt->execute([trim($fullName), $phoneNumber, $profilePicture, (int)$userId]);
}

/**
 * Changes a user's account status (active, inactive, suspended).
 *
 * @param PDO $pdo Active database connection instance
 * @param int $userId Target user ID
 * @param string $status New status
 * @return bool True on success
 */
function updateUserStatus($pdo, $userId, $status) {
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
    return $stmt->execute([$status, (int)$userId]);
}
