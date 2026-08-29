<?php
require_once 'jwt_helper.php';

// Authentication Helper: Verifies that the client sent a valid JWT in the headers.
function authenticate_request() {
    // Get all incoming HTTP request headers
    $headers = getallheaders();
    $authHeader = '';

    // Look for the Authorization header (can be uppercase or lowercase)
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    }

    // JWT is standardly sent as "Bearer eyJhbGci..."
    // We use a regular expression to match the "Bearer <token>" pattern and capture the token part.
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        
        // Verify the token signature and expiration using our JWTHelper
        $decoded = JWTHelper::verify_jwt($token);
        if ($decoded) {
            return $decoded; // Verification succeeded: return the embedded user profiles
        }
    }

    // If the token is missing or validation failed, return 401 and exit
    http_response_code(401); // Unauthorized
    header('Content-Type: application/json');
    echo json_encode(["error" => "No token or invalid token, authorization denied"]);
    exit();
}
