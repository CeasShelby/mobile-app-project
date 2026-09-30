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
// Define helper function 'getUserPhoneSelect' accepting database connection object ($pdo)
function getUserPhoneSelect($pdo) {
    try {
        // Line 1: Execute SHOW COLUMNS SQL query to check if 'phone_number' column exists in 'users' table
        $check = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
        // Line 2: Return 'phone_number' if column exists, otherwise return SQL alias 'phone as phone_number'
        return $check ? "phone_number" : "phone as phone_number";
    } catch (Exception $e) {
        // If an exception occurs, fallback safely to alias string
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
// Define function named 'findUserById' accepting database object ($pdo) and integer user ID ($userId)
function findUserById($pdo, $userId) {
    // Line 1: Get appropriate phone column SQL fragment from helper function
    $phoneCol = getUserPhoneSelect($pdo);

    // Line 2: Prepare SQL SELECT query targeting 'users' table matching primary key 'id'
    $stmt = $pdo->prepare("
        SELECT id, email, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE id = ?
    ");

    // Line 3: Cast $userId to integer for safety, bind to placeholder '?', and execute query on MySQL
    $stmt->execute([(int)$userId]);

    // Line 4: Fetch and return single matching user row as an associative array (or false if user doesn't exist)
    return $stmt->fetch();
}

/**
 * Finds a user account by email address (used during login & auth checks).
 *
 * WHY: Login form requires validating credentials using the email address.
 * WHAT: Retrieves full user record including encrypted password hash.
 * HOW: $stmt->fetch() returns user array which is evaluated by password_verify().
 */
// Define function named 'findUserByEmail' accepting database object ($pdo) and email string ($email)
function findUserByEmail($pdo, $email) {
    // Line 1: Resolve phone column name dynamically
    $phoneCol = getUserPhoneSelect($pdo);

    // Line 2: Prepare SQL SELECT query selecting user details INCLUDING password hash for verification
    $stmt = $pdo->prepare("
        SELECT id, email, password, full_name, {$phoneCol}, role, status, profile_picture, created_at, updated_at 
        FROM users 
        WHERE email = ?
    ");

    // Line 3: Strip surrounding whitespace from email string using trim(), bind to placeholder '?', and execute
    $stmt->execute([trim($email)]);

    // Line 4: Fetch and return matching user row as associative array (or false if email not found)
    return $stmt->fetch();
}

/**
 * Creates a new user record in the `users` table.
 *
 * WHY: Registers new parents, teachers, or administrators into the portal.
 * WHAT: Inserts full name, email, encrypted password, role, and phone number.
 * HOW: $pdo->lastInsertId() returns newly generated primary key integer ID.
 */
// Define function named 'createUser' accepting user registration details
function createUser($pdo, $fullName, $email, $hashedPassword, $role, $phoneNumber = null) {
    // Line 1: Check whether phone or phone_number column exists in 'users' table
    $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
    // Line 2: Store column name string ('phone_number' or 'phone') in variable $colName
    $colName = $phoneCheck ? "phone_number" : "phone";

    // Line 3: Prepare SQL INSERT query template with default account status 'active'
    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, password, role, {$colName}, status) 
        VALUES (?, ?, ?, ?, ?, 'active')
    ");

    // Line 4: Execute query with array of parameter values (trimming name and email)
    $stmt->execute([
        trim($fullName),
        trim($email),
        $hashedPassword,
        $role,
        $phoneNumber
    ]);

    // Line 5: Retrieve and return newly generated auto-increment primary key ID as integer
    return (int)$pdo->lastInsertId();
}

/**
 * Updates a user's password.
 *
 * WHY: Password reset and change password features.
 * WHAT: Updates encrypted password hash for target user ID.
 * HOW: $stmt->execute() returns boolean true on successful update.
 */
// Define function named 'updateUserPassword' accepting database object, user ID, and new BCrypt password hash
function updateUserPassword($pdo, $userId, $newHashedPassword) {
    // Line 1: Prepare SQL UPDATE query to change password column where user ID matches
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    // Line 2: Execute query passing new password hash and integer-casted user ID; returns boolean true/false
    return $stmt->execute([$newHashedPassword, (int)$userId]);
}

/**
 * Updates a user's profile details (Name, Phone, Profile Picture).
 *
 * WHY: Profile editing modal in React Native app.
 * WHAT: Updates full_name, phone, and optional profile_picture.
 * HOW: Uses COALESCE(?, profile_picture) to preserve existing picture if null passed.
 */
// Define function named 'updateUserProfile' accepting updated user profile fields
function updateUserProfile($pdo, $userId, $fullName, $phoneNumber = null, $profilePicture = null) {
    // Line 1: Check phone column schema name
    $phoneCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'phone_number'")->fetch();
    $colName = $phoneCheck ? "phone_number" : "phone";

    // Line 2: Prepare SQL UPDATE query template
    // COALESCE(?, profile_picture) -> If null is passed for profilePicture, keep existing image URL intact
    $stmt = $pdo->prepare("
        UPDATE users 
        SET full_name = ?, {$colName} = ?, profile_picture = COALESCE(?, profile_picture) 
        WHERE id = ?
    ");

    // Line 3: Execute query with bound parameter values; returns boolean true on success
    return $stmt->execute([trim($fullName), $phoneNumber, $profilePicture, (int)$userId]);
}

/**
 * Changes a user's account status (active, inactive, suspended).
 *
 * WHY: Administrative control to activate or suspend accounts.
 * WHAT: Updates status column in users table.
 * HOW: $stmt->execute([$status, (int)$userId]) updates target record.
 */
// Define function named 'updateUserStatus' accepting database connection, user ID, and target status string
function updateUserStatus($pdo, $userId, $status) {
    // Line 1: Prepare SQL UPDATE statement setting status column where id matches
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
    // Line 2: Execute statement with status string and integer user ID
    return $stmt->execute([$status, (int)$userId]);
}
