<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

// Authenticate: Ensure user is logged in and is admin
$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only administrators can manage students."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all students along with class name and linked parent names
            $stmt = $pdo->query("
                SELECT 
                    s.id,
                    COALESCE(s.admission_number, s.student_number) as admission_number,
                    TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as full_name,
                    s.date_of_birth,
                    s.gender,
                    s.status,
                    s.class_id,
                    c.class_name,
                    GROUP_CONCAT(u.full_name SEPARATOR ', ') as parent_names
                FROM students s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN parent_students ps ON s.id = ps.student_id
                LEFT JOIN parents p ON ps.parent_id = p.id
                LEFT JOIN users u ON p.user_id = u.id
                GROUP BY s.id
                ORDER BY s.id ASC
            ");
            $students = $stmt->fetchAll();
            echo json_encode($students ? $students : []);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            $fullName = isset($data['full_name']) ? trim($data['full_name']) : '';
            $classId  = isset($data['class_id']) ? intval($data['class_id']) : null;
            $gender   = isset($data['gender']) ? ucfirst(strtolower(trim($data['gender']))) : 'Male';
            $dob      = isset($data['date_of_birth']) ? trim($data['date_of_birth']) : date('Y-m-d');
            $parentUserId = isset($data['parent_user_id']) ? intval($data['parent_user_id']) : null;

            if (empty($fullName)) {
                http_response_code(400);
                echo json_encode(["error" => "Full name is required"]);
                exit();
            }

            // Split full_name into first_name and last_name
            $parts = explode(' ', $fullName, 2);
            $firstName = $parts[0];
            $lastName  = isset($parts[1]) ? $parts[1] : '';

            // Generate unique admission number
            $admNum = 'STU-' . date('Y') . '-' . rand(100, 999);

            $stmt = $pdo->prepare("
                INSERT INTO students (admission_number, student_number, first_name, last_name, date_of_birth, gender, class_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$admNum, $admNum, $firstName, $lastName, $dob, $gender, $classId]);
            $studentId = (int)$pdo->lastInsertId();

            // Auto-link parent if parent_user_id was provided
            if ($parentUserId && $parentUserId > 0) {
                $pStmt = $pdo->prepare("SELECT id FROM parents WHERE user_id = ?");
                $pStmt->execute([$parentUserId]);
                $parent = $pStmt->fetch();
                if ($parent) {
                    $linkStmt = $pdo->prepare("INSERT IGNORE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, 'Parent')");
                    $linkStmt->execute([$parent['id'], $studentId]);
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Student registered successfully",
                "id" => $studentId,
                "admission_number" => $admNum
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
