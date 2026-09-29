<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../models/init_models.php';
require_once __DIR__ . '/../../middleware/auth.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all staff members along with user profile details
            $stmt = $pdo->query("
                SELECT 
                    st.id as staff_id,
                    u.id as user_id,
                    u.full_name,
                    u.email,
                    u.phone_number,
                    u.status,
                    COALESCE(st.role_title, 'School Staff') as role_title,
                    st.department
                FROM staff st
                JOIN users u ON st.user_id = u.id
                ORDER BY u.full_name ASC
            ");
            $staffList = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fallback Ugandan Secondary School Staff if none in database yet
            if (empty($staffList)) {
                $staffList = [
                    ['staff_id' => 1, 'user_id' => 101, 'full_name' => 'Dr. Andrew Mukasa', 'email' => 'headteacher@school.ac.ug', 'role_title' => 'Headteacher', 'department' => 'Administration', 'status' => 'active'],
                    ['staff_id' => 2, 'user_id' => 102, 'full_name' => 'Sister Mary Akello', 'email' => 'deputy@school.ac.ug', 'role_title' => 'Deputy Headteacher (Academics)', 'department' => 'Academics', 'status' => 'active'],
                    ['staff_id' => 3, 'user_id' => 103, 'full_name' => 'Mrs. Grace Katusiime', 'email' => 'counselor@school.ac.ug', 'role_title' => 'Senior Woman / Counselor', 'department' => 'Student Welfare', 'status' => 'active'],
                    ['staff_id' => 4, 'user_id' => 104, 'full_name' => 'Mr. Joseph Okello', 'email' => 'bursar@school.ac.ug', 'role_title' => 'Bursar (Accounts)', 'department' => 'Finance', 'status' => 'active'],
                ];
            }

            echo json_encode($staffList);
            break;

        case 'POST':
            if ($currentUser['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(["error" => "Access denied: Only administrators can register staff."]);
                exit();
            }

            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $fullName  = isset($data['full_name']) ? trim($data['full_name']) : '';
            $email     = isset($data['email']) ? trim($data['email']) : '';
            $password  = isset($data['password']) ? trim($data['password']) : 'password123';
            $roleTitle = isset($data['role_title']) ? trim($data['role_title']) : 'School Staff';
            $dept      = isset($data['department']) ? trim($data['department']) : 'Administration';

            if (empty($fullName) || empty($email)) {
                http_response_code(400);
                echo json_encode(["error" => "Full name and email are required"]);
                exit();
            }

            $passHash = password_hash($password, PASSWORD_BCRYPT);
            $uStmt = $pdo->prepare("INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')");
            $uStmt->execute([$fullName, $email, $passHash]);
            $userId = (int)$pdo->lastInsertId();

            $sStmt = $pdo->prepare("INSERT INTO staff (user_id, role_title, department) VALUES (?, ?, ?)");
            $sStmt->execute([$userId, $roleTitle, $dept]);
            $staffId = (int)$pdo->lastInsertId();

            echo json_encode([
                "success" => true,
                "message" => "School staff account registered successfully",
                "staff_id" => $staffId,
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
