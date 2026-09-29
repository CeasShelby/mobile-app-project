<?php
// ============================================================
// Admin: Manage Teachers API Endpoint
// File: parent-teacher-backend/admin/manage_teachers.php
// Handles GET (list teachers) and POST (create/assign teacher)
// ============================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied: Only administrators can manage teachers."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all teachers along with their assigned class names from teacher_classes
            // Live DB teacher_classes: (teacher_id, class_id, subject_id) — no academic_period_id or is_homeroom_teacher
            $stmt = $pdo->query("
                SELECT
                    t.id AS teacher_id,
                    u.id AS user_id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.status,
                    t.employee_number,
                    t.qualification,
                    t.specialization,
                    GROUP_CONCAT(c.class_name ORDER BY c.class_name SEPARATOR ', ') AS assigned_classes
                FROM teachers t
                JOIN users u ON t.user_id = u.id
                LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
                LEFT JOIN classes c ON tc.class_id = c.id
                GROUP BY t.id
                ORDER BY u.full_name ASC
            ");
            $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($teachers ? $teachers : []);
            break;

        case 'POST':
            $input  = file_get_contents('php://input');
            $data   = json_decode($input, true);
            $action = isset($data['action']) ? $data['action'] : 'create';

            if ($action === 'assign_class') {
                // Assign an existing teacher to an additional class
                $teacherId = intval($data['teacher_id'] ?? 0);
                $classId   = intval($data['class_id'] ?? 0);

                if ($teacherId <= 0 || $classId <= 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "teacher_id and class_id are required"]);
                    exit();
                }

                // Live DB teacher_classes has no academic_period_id or is_homeroom_teacher columns
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO teacher_classes (teacher_id, class_id)
                    VALUES (?, ?)
                ");
                $stmt->execute([$teacherId, $classId]);

                echo json_encode(["success" => true, "message" => "Teacher assigned to class successfully"]);
                break;
            }

            // --- Create new teacher user account & profile ---
            $fullName       = isset($data['full_name'])      ? trim($data['full_name'])      : '';
            $email          = isset($data['email'])          ? trim($data['email'])          : '';
            $phone          = isset($data['phone'])          ? trim($data['phone'])          : null;
            $password       = isset($data['password'])       ? trim($data['password'])       : 'password';
            $specialization = isset($data['specialization']) ? trim($data['specialization']) : 'General Education';
            $classIds       = isset($data['class_ids']) && is_array($data['class_ids'])
                                ? $data['class_ids'] : [];

            if (empty($fullName) || empty($email)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Full name and email are required"]);
                exit();
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid email address format"]);
                exit();
            }

            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $checkStmt->execute([$email]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(["success" => false, "error" => "A user with this email already exists"]);
                exit();
            }

            $passHash = password_hash($password, PASSWORD_BCRYPT);

            $uStmt = $pdo->prepare("
                INSERT INTO users (full_name, email, phone, password, role, status)
                VALUES (?, ?, ?, ?, 'teacher', 'active')
            ");
            $uStmt->execute([$fullName, $email, $phone, $passHash]);
            $userId = (int)$pdo->lastInsertId();

            $empNum = 'EMP-' . strtoupper(substr(md5($email . time()), 0, 6));

            $tStmt = $pdo->prepare("
                INSERT INTO teachers (user_id, employee_number, qualification, specialization)
                VALUES (?, ?, 'Bachelor of Education', ?)
            ");
            $tStmt->execute([$userId, $empNum, $specialization]);
            $teacherId = (int)$pdo->lastInsertId();

            // Assign initial classes if provided — no academic_period_id in live DB
            if (!empty($classIds)) {
                $tcStmt = $pdo->prepare("
                    INSERT IGNORE INTO teacher_classes (teacher_id, class_id)
                    VALUES (?, ?)
                ");
                foreach ($classIds as $cId) {
                    $cId = intval($cId);
                    if ($cId > 0) {
                        $tcStmt->execute([$teacherId, $cId]);
                    }
                }
            }

            echo json_encode([
                "success"         => true,
                "message"         => "Teacher account created successfully",
                "teacher_id"      => $teacherId,
                "employee_number" => $empNum
            ]);
            break;

        case 'PUT':
            // Edit an existing teacher's profile
            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $teacherId      = isset($data['teacher_id'])    ? intval($data['teacher_id'])            : 0;
            $specialization = isset($data['specialization']) ? trim($data['specialization'])         : null;
            $qualification  = isset($data['qualification'])  ? trim($data['qualification'])          : null;
            $fullName       = isset($data['full_name'])       ? trim($data['full_name'])             : null;
            $phone          = isset($data['phone'])           ? trim($data['phone'])                 : null;
            $status         = isset($data['status']) && in_array($data['status'], ['active','inactive'])
                                ? $data['status'] : null;

            if ($teacherId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "teacher_id is required"]);
                exit();
            }

            // Get the user_id for this teacher
            $tRow = $pdo->prepare("SELECT user_id FROM teachers WHERE id = ?");
            $tRow->execute([$teacherId]);
            $tData = $tRow->fetch(PDO::FETCH_ASSOC);
            if (!$tData) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Teacher not found"]);
                exit();
            }
            $userId = $tData['user_id'];

            // Update teachers table
            $teacherUpdates = [];
            $teacherParams  = [];
            if ($specialization !== null) { $teacherUpdates[] = "specialization = ?"; $teacherParams[] = $specialization; }
            if ($qualification  !== null) { $teacherUpdates[] = "qualification = ?";  $teacherParams[] = $qualification; }
            if (!empty($teacherUpdates)) {
                $teacherParams[] = $teacherId;
                $pdo->prepare("UPDATE teachers SET " . implode(', ', $teacherUpdates) . " WHERE id = ?")->execute($teacherParams);
            }

            // Update users table
            $userUpdates = [];
            $userParams  = [];
            if ($fullName !== null) { $userUpdates[] = "full_name = ?"; $userParams[] = $fullName; }
            if ($phone    !== null) { $userUpdates[] = "phone = ?";     $userParams[] = $phone; }
            if ($status   !== null) { $userUpdates[] = "status = ?";    $userParams[] = $status; }
            if (!empty($userUpdates)) {
                $userParams[] = $userId;
                $pdo->prepare("UPDATE users SET " . implode(', ', $userUpdates) . " WHERE id = ?")->execute($userParams);
            }

            // Update assigned classes if class_ids provided in payload
            if (isset($data['class_ids']) && is_array($data['class_ids'])) {
                $pdo->prepare("DELETE FROM teacher_classes WHERE teacher_id = ?")->execute([$teacherId]);
                $tcStmt = $pdo->prepare("INSERT IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)");
                foreach ($data['class_ids'] as $cId) {
                    $cId = intval($cId);
                    if ($cId > 0) {
                        $tcStmt->execute([$teacherId, $cId]);
                    }
                }
            }

            echo json_encode(["success" => true, "message" => "Teacher profile updated successfully"]);
            break;

        case 'DELETE':
            $input     = file_get_contents('php://input');
            $data      = json_decode($input, true);
            $teacherId = intval($_GET['teacher_id'] ?? ($_GET['id'] ?? ($data['teacher_id'] ?? ($data['id'] ?? 0))));

            if ($teacherId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Valid teacher_id is required"]);
                exit();
            }

            // Find linked user_id
            $tRow = $pdo->prepare("SELECT user_id FROM teachers WHERE id = ?");
            $tRow->execute([$teacherId]);
            $tFetch = $tRow->fetch(PDO::FETCH_ASSOC);

            // Remove teacher_classes junction rows
            $pdo->prepare("DELETE FROM teacher_classes WHERE teacher_id = ?")->execute([$teacherId]);
            $pdo->prepare("DELETE FROM teachers WHERE id = ?")->execute([$teacherId]);

            if ($tFetch && !empty($tFetch['user_id'])) {
                $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$tFetch['user_id']]);
            }

            echo json_encode(["success" => true, "message" => "Teacher account deleted successfully"]);
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
