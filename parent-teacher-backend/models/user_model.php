<?php
// ============================================================
// User Model Functions
// File: parent-teacher-backend/models/user_model.php
//
// 🎯 WHY THIS FILE EXISTS:
// Handles all SQL database CRUD (Create, Read, Update, Delete) operations
// for the `users` table, isolating query logic from API route controllers.
//
// 💡 WHAT IT DOES:
// Provides function helpers for finding users by ID or email, registering
// new accounts with BCrypt encrypted passwords, updating profiles, and changing status.
//
// ⚙️ HOW IT WORKS:
// Uses PDO Prepared Statements ($pdo->prepare()) with parameter placeholders (?)
// to ensure complete security against SQL Injection attacks.
// ============================================================

/**
 * Dynamic Helper: Get phone column alias for SQL query compatibility
 * 
 * WHY: Database schemas can differ slightly (some use `phone`, others `phone_number`).
 * WHAT: Dynamically checks database table metadata via SHOW COLUMNS.
 * HOW: Returns column alias string to embed safely inside SELECT queries.
 */
function getUserPhoneSelect($pdo) {
    try {
        // WHAT: Queries database column metadata for `users` table
        $check = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
        // HOW: Returns exact column name or alias
        return $check ? "phone_number" : "phone as phone_number";
    } catch (Exception $e) {
        return "phone as phone_number";
    }
}

/**
 * Finds a user account by unique user ID.
 *
 * WHY: Required when authenticating JWT tokens or fetching user profiles.
 * WHAT: Executes a prepared SELECT query filtering by primary key `id`.
 * HOW: $stmt->execute([(int)$userId]) binds integer ID safely to `?` placeholder.
 */
function findUserById($pdo, $userId) {
    // 1. WHAT: Resolve phone column name dynamically
    $phoneCol = getUserPhoneSelect($pdo);
    // 2. HOW: Prepare SQL query with parameter binding to prevent SQL injection
    $stmt = $pdo->prepare("
        SELECT id, email, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE id = ?
    ");
    // 3. HOW: Execute query safely by passing bound parameters array
    $stmt->execute([(int)$userId]);
    // 4. WHAT: Returns associative array row or false if user does not exist
    return $stmt->fetch();
}

/**
 * Finds a user account by email address (used during login & auth checks).
 *
 * WHY: Login form requires validating credentials using the email address.
 * WHAT: Retrieves full user record including encrypted password hash.
 * HOW: $stmt->fetch() returns user array which is evaluated by password_verify().
 */
function findUserByEmail($pdo, $email) {
    $phoneCol = getUserPhoneSelect($pdo);
    // 1. HOW: Prepare SQL query with placeholder `?`
    $stmt = $pdo->prepare("
        SELECT id, email, password, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE email = ?
    ");
    // 2. HOW: Trim email whitespace and execute safely
    $stmt->execute([trim($email)]);
    // 3. WHAT: Return matching user associative array row
    return $stmt->fetch();
}

/**
 * Creates a new user record in the `users` table.
 *
 * WHY: Registers new parents, teachers, or administrators into the portal.
 * WHAT: Inserts full name, email, encrypted password, role, and phone number.
 * HOW: $pdo->lastInsertId() returns newly generated primary key integer ID.
 */
function createUser($pdo, $fullName, $email, $hashedPassword, $role, $phoneNumber = null) {
    // 1. WHAT: Check phone column schema name
    $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
    $colName = $phoneCheck ? "phone_number" : "phone";

    // 2. HOW: Prepare SQL INSERT statement with default status 'active'
    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, password, role, {$colName}, status) 
        VALUES (?, ?, ?, ?, ?, 'active')
    ");
    // 3. HOW: Execute insertion with bound parameters
    $stmt->execute([
        trim($fullName),
        trim($email),
        $hashedPassword,
        $role,
        $phoneNumber
    ]);
    // 4. WHAT: Return newly generated user ID integer
    return (int)$pdo->lastInsertId();
}

/**
 * Updates a user's password.
 *
 * WHY: Password reset and change password features.
 * WHAT: Updates encrypted password hash for target user ID.
 * HOW: $stmt->execute() returns boolean true on successful update.
 */
function updateUserPassword($pdo, $userId, $newHashedPassword) {
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    return $stmt->execute([$newHashedPassword, (int)$userId]);
}

/**
 * Updates a user's profile details (Name, Phone, Profile Picture).
 *
 * WHY: Profile editing modal in React Native app.
 * WHAT: Updates full_name, phone, and optional profile_picture.
 * HOW: Uses COALESCE(?, profile_picture) to preserve existing picture if null passed.
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
 * WHY: Administrative control to activate or suspend accounts.
 * WHAT: Updates status column in users table.
 * HOW: $stmt->execute([$status, (int)$userId]) updates target record.
 */
function updateUserStatus($pdo, $userId, $status) {
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
    return $stmt->execute([$status, (int)$userId]);
}
