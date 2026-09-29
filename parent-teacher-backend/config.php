<?php
ini_set('display_errors', '0');
error_reporting(0);

// CORS Headers: Allows the React Native app to send HTTP requests to this PHP backend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle OPTIONS Preflight Requests:
// Fetch clients (like Axios/Fetch) automatically send a fast check "OPTIONS" request to verify server rules.
// If the method is OPTIONS, we respond with 200 OK and stop executing further code.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Connection Credentials (XAMPP Defaults)
$host = '127.0.0.1';
$db   = 'parent_teacher_app';
$user = 'root';
$pass = 'root';
$charset = 'utf8mb4';

// DSN (Data Source Name) tells PDO which driver (mysql), host, database name, and character set to use
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Configuration options for PDO:
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on SQL mistakes
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Return database records as clean arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Disable emulation to use native prepared statements (secure)
];

try {
     // Create a new PDO database connection pool instance
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Fallback: Try connecting with empty password '' (default for XAMPP / WAMP on Windows)
     try {
         $pdo = new PDO($dsn, $user, '', $options);
     } catch (\PDOException $e2) {
         // If database connection fails, return 500 error code and stop execution
         http_response_code(500);
         header('Content-Type: application/json');
         echo json_encode(["error" => "Database connection failed: " . $e2->getMessage()]);
         exit();
     }
}
