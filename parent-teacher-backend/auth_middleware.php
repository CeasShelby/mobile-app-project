<?php
require_once __DIR__ . '/jwt_helper.php';

// Authentication Helper: Verifies that the client sent a valid JWT in the headers.
function authenticate_request() {
    $authHeader = '';

    // 1. Check $_SERVER global variables (FastCGI, Apache rewrite, CGI)
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        // 2. Check getallheaders()
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
    }

    // JWT is standardly sent as "Bearer eyJhbGci..."
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        
        // Verify the token signature and expiration using JWTHelper
        $decoded = JWTHelper::verify_jwt($token);
        if ($decoded) {
            return $decoded; // Verification succeeded: return embedded user profile
        }
    }

    // If token is missing or validation failed, return 401 Unauthorized
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(["error" => "No token or invalid token, authorization denied"]);
    exit();
}

