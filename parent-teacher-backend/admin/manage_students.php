<?php
// ============================================================
// Admin: Manage Students API Endpoint
// File: parent-teacher-backend/admin/manage_students.php
// Handles GET (list students), POST (enrol student), PUT (edit student), DELETE
// ============================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied: Only administrators can manage students."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Live DB: students has first_name + last_name + generated full_name
            // parent_students uses 'relationship' column
            $stmt = $pdo->query("
                SELECT
                    s.id,
                    COALESCE(s.admission_number, s.student_number, CONCAT('STU-', s.id)) AS admission_number,
                    TRIM(CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,''))) AS full_name,
                    s.first_name,
                    s.last_name,
                    s.date_of_birth,
                    s.gender,
                    COALESCE(s.status, 'active') AS status,
                    s.class_id,
                    s.combination,
                    c.class_name,
                    GROUP_CONCAT(u.full_name SEPARATOR ', ') AS parent_names
                FROM students s
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN parent_students ps ON s.id = ps.student_id
                LEFT JOIN parents p ON ps.parent_id = p.id
                LEFT JOIN users u ON p.user_id = u.id
                GROUP BY s.id, s.first_name, s.last_name, s.admission_number,
                         s.student_number, s.date_of_birth, s.gender, s.status,
                         s.class_id, s.combination, c.class_name
                ORDER BY s.first_name ASC, s.last_name ASC
            ");
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($students ? $students : []);
            break;

        case 'PUT':
            // Edit an existing student record
            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $studentId       = isset($data['id']) ? intval($data['id']) : 0;
            $firstName       = isset($data['first_name']) ? trim($data['first_name']) : '';
            $lastName        = isset($data['last_name'])  ? trim($data['last_name'])  : '';
            $combination     = isset($data['combination']) ? trim($data['combination']) : null;
            $customClassName = isset($data['custom_class_name']) ? trim($data['custom_class_name']) : '';

            // Support full_name from frontend
            if (empty($firstName) && isset($data['full_name'])) {
                $parts     = explode(' ', trim($data['full_name']), 2);
                $firstName = $parts[0] ?? '';
                $lastName  = $parts[1] ?? '';
            }
            $classId = isset($data['class_id']) ? intval($data['class_id']) : null;
            $gender  = isset($data['gender'])   ? ucfirst(strtolower(trim($data['gender']))) : null;

            if ($studentId <= 0 || empty($firstName)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Student ID and name are required"]);
                exit();
            }

            // If custom class name provided, resolve or insert
            if (!empty($customClassName)) {
                $cStmt = $pdo->prepare("SELECT id FROM classes WHERE LOWER(class_name) = LOWER(?)");
                $cStmt->execute([$customClassName]);
                $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
                if ($cRow) {
                    $classId = (int)$cRow['id'];
                } else {
                    $insC = $pdo->prepare("INSERT INTO classes (class_name, grade_level, class_level, academic_year) VALUES (?, 10, 'Secondary', YEAR(CURRENT_DATE))");
                    $insC->execute([$customClassName]);
                    $classId = (int)$pdo->lastInsertId();
                }
            }

            $setParts = ["first_name = ?", "last_name = ?", "combination = ?"];
            $params   = [$firstName, $lastName, $combination];

            if ($gender && in_array($gender, ['Male', 'Female', 'Other'])) {
                $setParts[] = "gender = ?";
                $params[]   = $gender;
            }
            if ($classId !== null) {
                $setParts[] = "class_id = ?";
                $params[]   = $classId > 0 ? $classId : null;
            }
            $params[] = $studentId;

            $stmt = $pdo->prepare("UPDATE students SET " . implode(', ', $setParts) . " WHERE id = ?");
            $stmt->execute($params);

            echo json_encode(["success" => true, "message" => "Student updated successfully"]);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $firstName       = isset($data['first_name'])    ? trim($data['first_name'])    : '';
            $lastName        = isset($data['last_name'])     ? trim($data['last_name'])     : '';
            $combination     = isset($data['combination'])   ? trim($data['combination'])   : null;
            $customClassName = isset($data['custom_class_name']) ? trim($data['custom_class_name']) : '';

            // Support full_name from frontend and split it
            if (empty($firstName) && isset($data['full_name'])) {
                $parts     = explode(' ', trim($data['full_name']), 2);
                $firstName = $parts[0] ?? '';
                $lastName  = $parts[1] ?? '';
            }
            $classId      = isset($data['class_id']) ? intval($data['class_id']) : null;
            $gender       = isset($data['gender']) ? ucfirst(strtolower(trim($data['gender']))) : 'Male';
            $dob          = isset($data['date_of_birth']) ? trim($data['date_of_birth']) : date('Y-m-d', strtotime('-14 years'));
            $parentUserId = isset($data['parent_user_id']) && intval($data['parent_user_id']) > 0
                              ? intval($data['parent_user_id']) : null;

            if (empty($firstName)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Student name is required"]);
                exit();
            }

            // If custom class name provided, resolve or create new class
            if (!empty($customClassName)) {
                $cStmt = $pdo->prepare("SELECT id FROM classes WHERE LOWER(class_name) = LOWER(?)");
                $cStmt->execute([$customClassName]);
                $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
                if ($cRow) {
                    $classId = (int)$cRow['id'];
                } else {
                    $insC = $pdo->prepare("INSERT INTO classes (class_name, grade_level, class_level, academic_year) VALUES (?, 10, 'Secondary', YEAR(CURRENT_DATE))");
                    $insC->execute([$customClassName]);
                    $classId = (int)$pdo->lastInsertId();
                }
            }

            // Validate gender
            if (!in_array($gender, ['Male', 'Female', 'Other'])) {
                $gender = 'Male';
            }

            // Validate class_id
            if ($classId !== null && $classId > 0) {
                $cCheck = $pdo->prepare("SELECT id FROM classes WHERE id = ?");
                $cCheck->execute([$classId]);
                if (!$cCheck->fetch()) $classId = null;
            } else {
                $classId = null;
            }

            $admNum = 'STU-' . date('Y') . '-' . str_pad(rand(100, 9999), 4, '0', STR_PAD_LEFT);

            $stmt = $pdo->prepare("
                INSERT INTO students (student_number, admission_number, first_name, last_name, date_of_birth, gender, class_id, combination, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$admNum, $admNum, $firstName, $lastName, $dob, $gender, $classId, $combination]);
            $studentId = (int)$pdo->lastInsertId();

            // Auto-link parent if parent_user_id provided
            if ($parentUserId !== null) {
                $pStmt = $pdo->prepare("SELECT id FROM parents WHERE user_id = ?");
                $pStmt->execute([$parentUserId]);
                $parent = $pStmt->fetch(PDO::FETCH_ASSOC);
                if ($parent) {
                    $linkStmt = $pdo->prepare("
                        INSERT IGNORE INTO parent_students (parent_id, student_id, relationship)
                        VALUES (?, ?, 'Parent')
                    ");
                    $linkStmt->execute([$parent['id'], $studentId]);
                }
            }

            echo json_encode([
                "success"          => true,
                "message"          => "Student enrolled successfully",
                "id"               => $studentId,
                "admission_number" => $admNum
            ]);
            break;

        case 'DELETE':
            $input     = file_get_contents('php://input');
            $data      = json_decode($input, true);
            $studentId = intval($_GET['id'] ?? ($data['id'] ?? 0));

            if ($studentId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Valid student ID is required"]);
                exit();
            }

            // Cleanup linked relationships and student records
            $pdo->prepare("DELETE FROM parent_students WHERE student_id = ?")->execute([$studentId]);
            $pdo->prepare("DELETE FROM student_progress WHERE student_id = ?")->execute([$studentId]);
            $pdo->prepare("DELETE FROM attendance WHERE student_id = ?")->execute([$studentId]);
            $pdo->prepare("DELETE FROM students WHERE id = ?")->execute([$studentId]);

            echo json_encode(["success" => true, "message" => "Student record deleted successfully"]);
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
