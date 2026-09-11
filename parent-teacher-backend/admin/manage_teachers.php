<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only administrators can manage teachers."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all teachers along with their assigned class names from teacher_classes
            $stmt = $pdo->query("
                SELECT 
                    t.id AS teacher_id, 
                    u.id AS user_id, 
                    u.full_name, 
                    u.email, 
                    u.status, 
                    t.employee_number, 
                    t.qualification, 
                    t.specialization,
                    GROUP_CONCAT(c.class_name SEPARATOR ', ') as assigned_classes
                FROM teachers t 
                JOIN users u ON t.user_id = u.id 
                LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
                LEFT JOIN classes c ON tc.class_id = c.id
                GROUP BY t.id
                ORDER BY u.full_name ASC
            ");
            $teachers = $stmt->fetchAll();
            echo json_encode($teachers ? $teachers : []);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            $action = isset($data['action']) ? $data['action'] : 'create';

            if ($action === 'assign_class') {
                // Assign a teacher to a specific class
                $teacherId = intval($data['teacher_id']);
                $classId   = intval($data['class_id']);

                if ($teacherId <= 0 || $classId <= 0) {
                    http_response_code(400);
                    echo json_encode(["error" => "teacher_id and class_id are required"]);
                    exit();
                }

                $stmt = $pdo->prepare("INSERT IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)");
                $stmt->execute([$teacherId, $classId]);

                echo json_encode(["success" => true, "message" => "Teacher assigned to class successfully"]);
                break;
            }

            // Create new teacher user account & profile
            $fullName       = isset($data['full_name']) ? trim($data['full_name']) : '';
            $email          = isset($data['email']) ? trim($data['email']) : '';
            $password       = isset($data['password']) ? trim($data['password']) : 'password';
            $specialization = isset($data['specialization']) ? trim($data['specialization']) : 'General Education';
            $classIds       = isset($data['class_ids']) && is_array($data['class_ids']) ? $data['class_ids'] : [];

            if (empty($fullName) || empty($email)) {
                http_response_code(400);
                echo json_encode(["error" => "Full name and email are required"]);
                exit();
            }

            $passHash = password_hash($password, PASSWORD_BCRYPT);
            $uStmt = $pdo->prepare("INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'teacher', 'active')");
            $uStmt->execute([$fullName, $email, $passHash]);
            $userId = (int)$pdo->lastInsertId();

            $empNum = 'EMP-' . rand(1000, 9999);
            $tStmt = $pdo->prepare("INSERT INTO teachers (user_id, employee_number, qualification, specialization) VALUES (?, ?, 'Bachelor of Education', ?)");
            $tStmt->execute([$userId, $empNum, $specialization]);
            $teacherId = (int)$pdo->lastInsertId();

            // Assign initial classes if provided
            if (!empty($classIds)) {
                $tcStmt = $pdo->prepare("INSERT IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)");
                foreach ($classIds as $cId) {
                    $tcStmt->execute([$teacherId, intval($cId)]);
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Teacher account created successfully",
                "teacher_id" => $teacherId,
                "employee_number" => $empNum
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
