<?php
// ============================================================
// Admin: Manage Classes API Endpoint
// File: parent-teacher-backend/admin/manage_classes.php
// Handles GET (list all classes) and POST (create new class stream)
// ============================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth_middleware.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json');

// Authenticate: Ensure user is logged in and is admin
$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied: Only administrators can manage classes."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all classes with assigned teacher (via teacher_classes) and student count.
            // Live DB: teacher_classes has (teacher_id, class_id, subject_id) — no is_homeroom_teacher column.
            // Live DB: students has (first_name, last_name) — no full_name column.
            // Live DB: students.status is ENUM('active','inactive') — not 'graduated'/'transferred'.
            $stmt = $pdo->query("
                SELECT
                    c.id,
                    c.class_name,
                    COALESCE(c.grade_level, 1)  AS grade_level,
                    c.class_level,
                    u.full_name                  AS teacher_name,
                    (
                        SELECT COUNT(*)
                        FROM students s
                        WHERE s.class_id = c.id
                          AND (s.status = 'active' OR s.status IS NULL)
                    ) AS student_count
                FROM classes c
                LEFT JOIN (
                    SELECT class_id, MIN(teacher_id) AS teacher_id
                    FROM teacher_classes
                    GROUP BY class_id
                ) tc ON c.id = tc.class_id
                LEFT JOIN teachers t  ON tc.teacher_id = t.id
                LEFT JOIN users   u  ON t.user_id      = u.id
                ORDER BY c.grade_level ASC, c.class_name ASC
            ");
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($classes ? $classes : []);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $className  = isset($data['class_name'])   ? trim($data['class_name'])   : '';
            $classLevel = isset($data['class_level'])  ? trim($data['class_level'])  : (
                          isset($data['class_name'])   ? trim($data['class_name'])   : ''
                          );
            // Accept academic_year from frontend (YYYY format). Default to current year.
            $academicYear = isset($data['academic_year']) ? intval($data['academic_year']) : intval(date('Y'));

            // teacher_id is teachers.id (not users.id)
            $teacherId = isset($data['teacher_id']) && intval($data['teacher_id']) > 0
                            ? intval($data['teacher_id'])
                            : null;

            // Auto-infer grade_level (1–6) from Ugandan stream name
            $gradeLevel = 1;
            if (stripos($className, 'Senior 6') !== false || stripos($className, 'S.6') !== false || stripos($className, 'S6') !== false) $gradeLevel = 6;
            elseif (stripos($className, 'Senior 5') !== false || stripos($className, 'S.5') !== false || stripos($className, 'S5') !== false) $gradeLevel = 5;
            elseif (stripos($className, 'Senior 4') !== false || stripos($className, 'S.4') !== false || stripos($className, 'S4') !== false) $gradeLevel = 4;
            elseif (stripos($className, 'Senior 3') !== false || stripos($className, 'S.3') !== false || stripos($className, 'S3') !== false) $gradeLevel = 3;
            elseif (stripos($className, 'Senior 2') !== false || stripos($className, 'S.2') !== false || stripos($className, 'S2') !== false) $gradeLevel = 2;
            elseif (isset($data['grade_level'])) $gradeLevel = intval($data['grade_level']);

            if (empty($className)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Secondary stream class_name is required"]);
                exit();
            }

            // Insert the class stream. Live DB classes table has:
            //   id, class_name, grade_level, class_level, academic_year, teacher_id, created_at
            $stmt = $pdo->prepare("
                INSERT INTO classes (class_name, grade_level, class_level, academic_year, teacher_id)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$className, $gradeLevel, $classLevel, $academicYear, $teacherId]);
            $classId = (int)$pdo->lastInsertId();

            // Also record in teacher_classes junction table if a teacher was assigned
            // Live DB teacher_classes: (teacher_id, class_id, subject_id) — no academic_period_id or is_homeroom_teacher
            if ($teacherId !== null && $teacherId > 0) {
                $tcStmt = $pdo->prepare("
                    INSERT IGNORE INTO teacher_classes (teacher_id, class_id)
                    VALUES (?, ?)
                ");
                $tcStmt->execute([$teacherId, $classId]);
            }

            echo json_encode([
                "success" => true,
                "message" => "Class stream created successfully",
                "id"      => $classId
            ]);
            break;

        case 'DELETE':
            $input   = file_get_contents('php://input');
            $data    = json_decode($input, true);
            $classId = intval($_GET['id'] ?? ($data['id'] ?? 0));

            if ($classId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Valid class ID is required"]);
                exit();
            }

            // Unlink students & teachers before deleting class
            $pdo->prepare("UPDATE students SET class_id = NULL WHERE class_id = ?")->execute([$classId]);
            $pdo->prepare("DELETE FROM teacher_classes WHERE class_id = ?")->execute([$classId]);
            $pdo->prepare("DELETE FROM classes WHERE id = ?")->execute([$classId]);

            echo json_encode(["success" => true, "message" => "Class stream deleted successfully"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "error" => "Method not allowed"]);
            break;
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database operation failed: " . $e->getMessage()]);
}
