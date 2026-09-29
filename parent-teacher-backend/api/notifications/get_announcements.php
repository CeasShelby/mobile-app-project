<?php
// ============================================================
// Announcements: Fetch Class & School Announcements Board
// File: parent-teacher-backend/notifications/get_announcements.php
// Standardized response format; role-scoped filtering preserved
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';

// 1. Authenticate Request
$currentUser = requireAuth();
$userId   = (int)($currentUser['id'] ?? 0);
$userRole = $currentUser['role'] ?? '';

try {
    // 2. Base query joining author details and optional class stream name
    $baseSql = "
        SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.class_id,
            a.created_by,
            a.is_published,
            a.created_at,
            a.updated_at,
            u.full_name   AS author_name,
            u.role        AS author_role,
            c.class_name,
            c.grade_level
        FROM announcements a
        JOIN users u ON a.created_by = u.id
        LEFT JOIN classes c ON a.class_id = c.id
    ";

    $params = [];

    // 3. Role-based scoping — each role sees only relevant announcements
    if ($userRole === 'admin') {
        // Admins see everything
        $whereClause = "WHERE a.is_published = 1";

    } elseif ($userRole === 'teacher') {
        // Teachers see: school-wide notices + stream-scoped notices for their assigned classes
        $whereClause = "
            WHERE a.is_published = 1
              AND (
                (a.class_id IS NULL AND a.target_audience IN ('all', 'teachers'))
                OR a.created_by = :user_id
                OR a.class_id IN (
                    SELECT tc.class_id
                    FROM teacher_classes tc
                    JOIN teachers t ON tc.teacher_id = t.id
                    WHERE t.user_id = :user_id2
                )
              )
        ";
        $params[':user_id']  = $userId;
        $params[':user_id2'] = $userId;

    } elseif ($userRole === 'parent') {
        // Parents see: school-wide parent notices + stream notices for their children's classes
        $whereClause = "
            WHERE a.is_published = 1
              AND (
                (a.class_id IS NULL AND a.target_audience IN ('all', 'parents'))
                OR a.class_id IN (
                    SELECT s.class_id
                    FROM students s
                    JOIN parent_students ps ON s.id = ps.student_id
                    JOIN parents p ON ps.parent_id = p.id
                    WHERE p.user_id = :user_id
                )
              )
        ";
        $params[':user_id'] = $userId;

    } else {
        $whereClause = "WHERE a.is_published = 1 AND a.class_id IS NULL AND a.target_audience = 'all'";
    }

    $finalSql = $baseSql . " " . $whereClause . " ORDER BY a.created_at DESC LIMIT 100";

    $stmt = $pdo->prepare($finalSql);
    $stmt->execute($params);
    $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Return standardized success response
    sendSuccess($announcements, "Announcements fetched successfully");

} catch (\PDOException $e) {
    sendError("Database query failed: " . $e->getMessage(), null, 500);
}
