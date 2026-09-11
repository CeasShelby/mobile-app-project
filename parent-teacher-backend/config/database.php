<?php
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

// 3. Database Credentials (XAMPP Default Settings)
$host = '127.0.0.1';
$db   = 'parent_teacher_app';
$user = 'root';
$pass = 'root'; // Change if your MySQL root password is empty or different
$charset = 'utf8mb4';

// Data Source Name (DSN) defines the driver, host, database name, and charset
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Configuration options for PDO (PHP Data Objects):
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on SQL mistakes
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch records as associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use native database prepared statements (SQLi defense)
];

try {
    // Create the global PDO database connection instance
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // If database connection fails, return 500 Internal Server Error in JSON format
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
    exit();
}
