<?php
// Include the database config and the JWT helper class
require_once 'config.php';
require_once 'jwt_helper.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Read raw JSON data from the request body:
// Mobile apps submit data as raw JSON. Standard $_POST only reads form-data.
// We use php://input to read the raw request payload, then decode it into a PHP array.
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$email = isset($data['email']) ? trim($data['email']) : '';
$password = isset($data['password']) ? $data['password'] : '';

// 1. Validation check
if (empty($email) || empty($password)) {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "Please enter both email and password"]);
    exit();
}

try {
    // 2. Fetch user by email using a PDO Prepared Statement.
    // Prepared statements protect us from SQL Injection by keeping code and input data separate.
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // 3. Verify user exists and the password matches
    // password_verify() matches a plaintext password to the secure bcrypt hash in the database.
    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid email or password"]);
        exit();
    }

    // 4. Check user status
    if (isset($user['status']) && $user['status'] !== 'active') {
        http_response_code(403); // Forbidden
        echo json_encode(["error" => "Your account is inactive. Please contact the administrator."]);
        exit();
    }

    // 5. Query role-specific ID mappings (needed by the mobile app context)
    $roleData = [];
    if ($user['role'] === 'teacher') {
        $teacherStmt = $pdo->prepare("SELECT id, employee_number, qualification, specialization FROM teachers WHERE user_id = ?");
        $teacherStmt->execute([$user['id']]);
        $teacher = $teacherStmt->fetch();
        if ($teacher) {
            $roleData = [
                'teacher_id' => $teacher['id'],
                'employee_number' => $teacher['employee_number'],
                'qualification' => $teacher['qualification'],
                'specialization' => $teacher['specialization']
            ];
        }
    } elseif ($user['role'] === 'parent') {
        $parentStmt = $pdo->prepare("SELECT id, occupation, address FROM parents WHERE user_id = ?");
        $parentStmt->execute([$user['id']]);
        $parent = $parentStmt->fetch();
        if ($parent) {
            $roleData = [
                'parent_id' => $parent['id'],
                'occupation' => $parent['occupation'],
                'address' => $parent['address']
            ];
        }
    }

    // 6. Construct the payload details to embed inside the token
    $payload = [
        'id' => $user['id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'role' => $user['role']
    ];
    $payload = array_merge($payload, $roleData);

    // 7. Generate the JWT
    $token = JWTHelper::generate_jwt($payload);

    // Remove the password hash from the user profile object before sending it to the client
    unset($user['password']);

    // Combine user profile data with role-specific data
    $userProfile = array_merge($user, $roleData);

    // 8. Return response
    echo json_encode([
        "token" => $token,
        "user" => $userProfile
    ]);

} catch (\PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
    exit();
}
