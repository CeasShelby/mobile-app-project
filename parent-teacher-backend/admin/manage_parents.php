<?php
// ============================================================
// Admin: Manage Parents API Endpoint
// File: parent-teacher-backend/admin/manage_parents.php
// Handles GET (list parents) and POST (create/link parent)
// ============================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied: Only administrators can manage parents."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch all parents with their linked students (using full_name, not first/last name)
            $stmt = $pdo->query("
                SELECT
                    p.id AS parent_id,
                    u.id AS user_id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.status,
                    p.occupation,
                    p.address,
                    GROUP_CONCAT(TRIM(CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,''))) SEPARATOR ', ') AS children_names
                FROM parents p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN parent_students ps ON p.id = ps.parent_id
                LEFT JOIN students s ON ps.student_id = s.id
                GROUP BY p.id
                ORDER BY u.full_name ASC
            ");
            $parents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($parents ? $parents : []);
            break;

        case 'POST':
            $input  = file_get_contents('php://input');
            $data   = json_decode($input, true);
            $action = isset($data['action']) ? $data['action'] : 'create';

            if ($action === 'link_student') {
                $parentId  = intval($data['parent_id']  ?? 0);
                $studentId = intval($data['student_id'] ?? 0);

                if ($parentId <= 0 || $studentId <= 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "parent_id and student_id are required"]);
                    exit();
                }

                // Live DB column name is 'relationship' (not relationship_type)
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO parent_students (parent_id, student_id, relationship)
                    VALUES (?, ?, 'Parent')
                ");
                $stmt->execute([$parentId, $studentId]);

                echo json_encode(["success" => true, "message" => "Parent linked to student successfully"]);
                break;
            }

            // --- Create new parent account ---
            $fullName   = isset($data['full_name'])   ? trim($data['full_name'])   : '';
            $email      = isset($data['email'])       ? trim($data['email'])       : '';
            $phone      = isset($data['phone'])       ? trim($data['phone'])       : null;
            $password   = isset($data['password'])    ? trim($data['password'])    : 'password';
            $occupation = isset($data['occupation'])  ? trim($data['occupation'])  : 'Guardian';
            $address    = isset($data['address'])     ? trim($data['address'])     : '';
            $studentIds = isset($data['student_ids']) && is_array($data['student_ids'])
                            ? $data['student_ids'] : [];

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

            // Check for duplicate email
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
                VALUES (?, ?, ?, ?, 'parent', 'active')
            ");
            $uStmt->execute([$fullName, $email, $phone, $passHash]);
            $userId = (int)$pdo->lastInsertId();

            $pStmt = $pdo->prepare("
                INSERT INTO parents (user_id, occupation, address)
                VALUES (?, ?, ?)
            ");
            $pStmt->execute([$userId, $occupation, $address]);
            $parentId = (int)$pdo->lastInsertId();

            // Link students if provided — live DB uses 'relationship' column
            if (!empty($studentIds)) {
                $psStmt = $pdo->prepare("
                    INSERT IGNORE INTO parent_students (parent_id, student_id, relationship)
                    VALUES (?, ?, 'Parent')
                ");
                foreach ($studentIds as $sId) {
                    $sId = intval($sId);
                    if ($sId > 0) {
                        $psStmt->execute([$parentId, $sId]);
                    }
                }
            }

            echo json_encode([
                "success"   => true,
                "message"   => "Parent account created successfully",
                "parent_id" => $parentId,
                "user_id"   => $userId
            ]);
            break;

        case 'PUT':
            // Edit an existing parent's profile
            $input = file_get_contents('php://input');
            $data  = json_decode($input, true);

            $parentId   = isset($data['parent_id'])  ? intval($data['parent_id'])       : 0;
            $fullName   = isset($data['full_name'])   ? trim($data['full_name'])         : null;
            $phone      = isset($data['phone'])       ? trim($data['phone'])             : null;
            $occupation = isset($data['occupation'])  ? trim($data['occupation'])        : null;
            $address    = isset($data['address'])     ? trim($data['address'])           : null;
            $status     = isset($data['status']) && in_array($data['status'], ['active','inactive'])
                            ? $data['status'] : null;

            if ($parentId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "parent_id is required"]);
                exit();
            }

            // Get user_id for this parent
            $pRow = $pdo->prepare("SELECT user_id FROM parents WHERE id = ?");
            $pRow->execute([$parentId]);
            $pData = $pRow->fetch(PDO::FETCH_ASSOC);
            if (!$pData) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Parent not found"]);
                exit();
            }
            $userId = $pData['user_id'];

            // Update parents table
            $parentUpdates = [];
            $parentParams  = [];
            if ($occupation !== null) { $parentUpdates[] = "occupation = ?"; $parentParams[] = $occupation; }
            if ($address    !== null) { $parentUpdates[] = "address = ?";    $parentParams[] = $address; }
            if (!empty($parentUpdates)) {
                $parentParams[] = $parentId;
                $pdo->prepare("UPDATE parents SET " . implode(', ', $parentUpdates) . " WHERE id = ?")->execute($parentParams);
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

            echo json_encode(["success" => true, "message" => "Parent profile updated successfully"]);
            break;

        case 'DELETE':
            $input    = file_get_contents('php://input');
            $data     = json_decode($input, true);
            $parentId = intval($_GET['parent_id'] ?? ($_GET['id'] ?? ($data['parent_id'] ?? ($data['id'] ?? 0))));

            if ($parentId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Valid parent_id is required"]);
                exit();
            }

            // Find linked user_id
            $pRow = $pdo->prepare("SELECT user_id FROM parents WHERE id = ?");
            $pRow->execute([$parentId]);
            $pFetch = $pRow->fetch(PDO::FETCH_ASSOC);

            // Cleanup junction rows & profile
            $pdo->prepare("DELETE FROM parent_students WHERE parent_id = ?")->execute([$parentId]);
            $pdo->prepare("DELETE FROM parents WHERE id = ?")->execute([$parentId]);

            if ($pFetch && !empty($pFetch['user_id'])) {
                $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$pFetch['user_id']]);
            }

            echo json_encode(["success" => true, "message" => "Parent account deleted successfully"]);
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
