<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only administrators can manage parents."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all parents along with their linked children's names
            $stmt = $pdo->query("
                SELECT 
                    p.id AS parent_id, 
                    u.id AS user_id, 
                    u.full_name, 
                    u.email, 
                    u.status, 
                    p.occupation, 
                    p.address,
                    GROUP_CONCAT(TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) SEPARATOR ', ') as children_names
                FROM parents p 
                JOIN users u ON p.user_id = u.id 
                LEFT JOIN parent_students ps ON p.id = ps.parent_id
                LEFT JOIN students s ON ps.student_id = s.id
                GROUP BY p.id
                ORDER BY u.full_name ASC
            ");
            $parents = $stmt->fetchAll();
            echo json_encode($parents ? $parents : []);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            $action = isset($data['action']) ? $data['action'] : 'create';

            if ($action === 'link_student') {
                $parentId  = intval($data['parent_id']);
                $studentId = intval($data['student_id']);

                if ($parentId <= 0 || $studentId <= 0) {
                    http_response_code(400);
                    echo json_encode(["error" => "parent_id and student_id are required"]);
                    exit();
                }

                $stmt = $pdo->prepare("INSERT IGNORE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, 'Parent')");
                $stmt->execute([$parentId, $studentId]);

                echo json_encode(["success" => true, "message" => "Parent linked to student successfully"]);
                break;
            }

            // Create new parent account
            $fullName   = isset($data['full_name']) ? trim($data['full_name']) : '';
            $email      = isset($data['email']) ? trim($data['email']) : '';
            $password   = isset($data['password']) ? trim($data['password']) : 'password';
            $occupation = isset($data['occupation']) ? trim($data['occupation']) : 'Guardian';
            $address    = isset($data['address']) ? trim($data['address']) : '';
            $studentIds = isset($data['student_ids']) && is_array($data['student_ids']) ? $data['student_ids'] : [];

            if (empty($fullName) || empty($email)) {
                http_response_code(400);
                echo json_encode(["error" => "Full name and email are required"]);
                exit();
            }

            $passHash = password_hash($password, PASSWORD_BCRYPT);
            $uStmt = $pdo->prepare("INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'parent', 'active')");
            $uStmt->execute([$fullName, $email, $passHash]);
            $userId = (int)$pdo->lastInsertId();

            $pStmt = $pdo->prepare("INSERT INTO parents (user_id, occupation, address) VALUES (?, ?, ?)");
            $pStmt->execute([$userId, $occupation, $address]);
            $parentId = (int)$pdo->lastInsertId();

            // Link students if provided
            if (!empty($studentIds)) {
                $psStmt = $pdo->prepare("INSERT IGNORE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, 'Parent')");
                foreach ($studentIds as $sId) {
                    $psStmt->execute([$parentId, intval($sId)]);
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Parent account created successfully",
                "parent_id" => $parentId,
                "user_id" => $userId
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
