<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
// ============================================================
// Database Configuration & Connection Pool
// File: parent-teacher-backend/config/database.php
// ============================================================

// 1. Set CORS (Cross-Origin Resource Sharing) Headers
// These headers allow your React Native mobile app (running on Expo) 
// to send HTTP requests to this PHP backend without being blocked by browser/mobile CORS policies.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 2. Handle HTTP OPTIONS Preflight Requests
// Mobile apps automatically send an "OPTIONS" check request before POST/PUT requests.
// If the request method is OPTIONS, respond immediately with 200 OK and stop execution.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Database Credentials (Environment Variables for Render Cloud / Fallback to XAMPP Local)
$host    = getenv('DB_HOST') ?: '127.0.0.1';
$db      = getenv('DB_NAME') ?: 'parent_teacher_app';
$user    = getenv('DB_USER') ?: 'root';
$pass    = getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'root';
$port    = getenv('DB_PORT') ?: '3306';
$charset = 'utf8mb4';

// Data Source Name (DSN) defines driver, host, port, database name, and charset
$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

// Configuration options for PDO (PHP Data Objects):
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on SQL mistakes
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch records as associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use native database prepared statements (SQLi defense)
];

try {
    // Create global PDO database connection instance using environment or root password
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Fallback for local XAMPP: Try connecting with empty password '' if default 'root' password failed
    if (!getenv('DB_HOST')) {
        try {
            $pdo = new PDO("mysql:host=127.0.0.1;dbname=$db;charset=$charset", $user, '', $options);
        } catch (\PDOException $e2) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                "success" => false,
                "message" => "Database connection error: " . $e2->getMessage()
            ]);
            exit();
        }
    } else {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            "success" => false,
            "message" => "Render Cloud Database Connection error: " . $e->getMessage()
        ]);
        exit();
    }
}
