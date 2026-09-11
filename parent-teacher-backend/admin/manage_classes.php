<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

// Authenticate: Ensure user is logged in and is admin
$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only administrators can manage classes."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all classes along with homeroom teacher name and enrolled student count
            $stmt = $pdo->query("
                SELECT 
                    c.id,
                    c.class_name,
                    c.class_level,
                    c.academic_year,
                    c.teacher_id,
                    u.full_name as teacher_name,
                    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
                FROM classes c
                LEFT JOIN teachers t ON c.teacher_id = t.id
                LEFT JOIN users u ON t.user_id = u.id
                ORDER BY c.class_name ASC
            ");
            $classes = $stmt->fetchAll();
            echo json_encode($classes ? $classes : []);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            $className  = isset($data['class_name']) ? trim($data['class_name']) : '';
            $classLevel = isset($data['class_level']) ? trim($data['class_level']) : 'High School';
            $year       = isset($data['academic_year']) ? trim($data['academic_year']) : date('Y');
            $teacherId  = isset($data['teacher_id']) ? intval($data['teacher_id']) : 1;

            if (empty($className)) {
                http_response_code(400);
                echo json_encode(["error" => "Class name is required"]);
                exit();
            }

            $stmt = $pdo->prepare("
                INSERT INTO classes (class_name, class_level, academic_year, teacher_id)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$className, $classLevel, $year, $teacherId]);
            $classId = (int)$pdo->lastInsertId();

            // Auto-assign homeroom teacher in teacher_classes
            if ($teacherId > 0) {
                $tcStmt = $pdo->prepare("INSERT IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)");
                $tcStmt->execute([$teacherId, $classId]);
            }

            echo json_encode([
                "success" => true,
                "message" => "Class created successfully",
                "id" => $classId
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
