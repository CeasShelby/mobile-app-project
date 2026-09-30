<?php
// ============================================================
// User Login & Authentication API Endpoint
// File: parent-teacher-backend/api/auth/login.php
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../jwt_helper.php';
require_once __DIR__ . '/../../models/init_models.php';

// 1. Read JSON request body sent from React Native mobile app
$input = getJsonInput();

$email    = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? trim($input['password']) : '';

// 2. Validate input fields
if (empty($email) || empty($password)) {
    sendError("Email and password are required.", [
        "email"    => empty($email) ? "Email is required" : null,
        "password" => empty($password) ? "Password is required" : null
    ], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError("Invalid email format.", null, 400);
}

try {
    // 3. Query user account using user_model function
    $user = findUserByEmail($pdo, $email);

    // 4. Verify user exists
    if (!$user) {
        sendError("Invalid email or password credentials.", null, 401);
    }

    // 5. Verify account status
    if ($user['status'] !== 'active') {
        sendError("Your account has been deactivated or suspended. Please contact school admin.", null, 403);
    }

    // 6. Secure Password Verification using PHP's password_verify()
    if (!password_verify($password, $user['password'])) {
        sendError("Invalid email or password credentials.", null, 401);
    }

    // 7. Fetch role-specific details using model helper functions
    $teacher_id = null;
    $parent_id  = null;

    if ($user['role'] === 'teacher') {
        $teacher = findTeacherByUserId($pdo, $user['id']);
        if ($teacher) {
            $teacher_id = $teacher['id'];
            $user['teacher_id'] = $teacher['id'];
            $user['employee_number'] = $teacher['employee_number'];
            $user['qualification']   = $teacher['qualification'];
            $user['specialization']  = $teacher['specialization'];
        }
    } elseif ($user['role'] === 'parent') {
        $parent = findParentByUserId($pdo, $user['id']);
        if ($parent) {
            $parent_id = $parent['id'];
            $user['parent_id']  = $parent['id'];
            $user['occupation'] = $parent['occupation'];
            $user['address']    = $parent['address'];
        }
    }

    // 8. Construct JWT Token Payload
    $tokenPayload = [
        "id"         => $user['id'],
        "email"      => $user['email'],
        "full_name"  => $user['full_name'],
        "role"       => $user['role'],
        "teacher_id" => $teacher_id,
        "parent_id"  => $parent_id,
    ];

    // Generate JWT Token
    $jwtToken = JWTHelper::generate_jwt($tokenPayload);

    // Remove password hash before returning user payload to mobile app
    unset($user['password']);

    // 9. Return success response with token and user profile
    sendSuccess([
        "token" => $jwtToken,
        "user"  => $user
    ], "Login successful. Welcome back!");

} catch (\Throwable $e) {
    sendError("Login processing error: " . $e->getMessage(), null, 500);
}
