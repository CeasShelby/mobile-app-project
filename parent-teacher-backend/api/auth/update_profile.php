<?php
// ============================================================
// Profile Management: Self-Service Profile Update API Endpoint
// File: parent-teacher-backend/api/auth/update_profile.php
// Rationale: Allows Parents, Teachers, and Admins to update contact info and role attributes
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// 1. Require JWT Authentication
$authUser = requireAuth();
$userId   = (int)$authUser['id'];

// 2. Parse JSON Input
$input = getJsonInput();

$fullName    = isset($input['full_name']) ? trim($input['full_name']) : '';
$phoneNumber = isset($input['phone_number']) ? trim($input['phone_number']) : null;

// Validate inputs
if (empty($fullName)) {
    sendError("Full name cannot be empty.", null, 400);
}

try {
    $pdo->beginTransaction();

    // 3. Update base user record (sync both phone and phone_number columns)
    $uStmt = $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, phone_number = ? WHERE id = ?");
    $uStmt->execute([$fullName, $phoneNumber, $phoneNumber, $userId]);

    // 4. Update role-specific attributes
    $role = $authUser['role'];

    if ($role === 'parent') {
        $occupation = isset($input['occupation']) ? trim($input['occupation']) : null;
        $address    = isset($input['address']) ? trim($input['address']) : null;

        $pStmt = $pdo->prepare("UPDATE parents SET occupation = ?, address = ? WHERE user_id = ?");
        $pStmt->execute([$occupation, $address, $userId]);
    } elseif ($role === 'teacher') {
        $qualification  = isset($input['qualification']) ? trim($input['qualification']) : null;
        $specialization = isset($input['specialization']) ? trim($input['specialization']) : null;

        $tStmt = $pdo->prepare("UPDATE teachers SET qualification = ?, specialization = ? WHERE user_id = ?");
        $tStmt->execute([$qualification, $specialization, $userId]);
    }

    $pdo->commit();

    // 5. Fetch updated user profile
    $fetchStmt = $pdo->prepare("SELECT id, email, full_name, phone_number, role, status, profile_picture, created_at FROM users WHERE id = ?");
    $fetchStmt->execute([$userId]);
    $user = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    if ($role === 'teacher') {
        $tFetch = $pdo->prepare("SELECT id, employee_number, qualification, specialization FROM teachers WHERE user_id = ?");
        $tFetch->execute([$userId]);
        $teacher = $tFetch->fetch(PDO::FETCH_ASSOC);
        if ($teacher) {
            $user['teacher_id']      = $teacher['id'];
            $user['employee_number'] = $teacher['employee_number'];
            $user['qualification']   = $teacher['qualification'];
            $user['specialization']  = $teacher['specialization'];
        }
    } elseif ($role === 'parent') {
        $pFetch = $pdo->prepare("SELECT id, occupation, address FROM parents WHERE user_id = ?");
        $pFetch->execute([$userId]);
        $parent = $pFetch->fetch(PDO::FETCH_ASSOC);
        if ($parent) {
            $user['parent_id']  = $parent['id'];
            $user['occupation'] = $parent['occupation'];
            $user['address']    = $parent['address'];
        }
    }

    sendSuccess($user, "Profile details updated successfully.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError("Failed to update profile: " . $e->getMessage(), null, 500);
}
