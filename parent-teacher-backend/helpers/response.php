<?php
// ============================================================
// Standardized API Response Helper Functions
// File: parent-teacher-backend/helpers/response.php
// ============================================================

/**
 * Send a standardized JSON success response.
 *
 * @param mixed  $data    The payload data to send to the mobile app
 * @param string $message User-friendly success message
 * @param int    $code    HTTP Status code (default 200 OK)
 */
function sendSuccess($data = null, $message = "Operation completed successfully", $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => true,
        "message" => $message,
        "data"    => $data
    ]);
    exit();
}

/**
 * Send a standardized JSON error response.
 *
 * @param string $message Human-readable error description
 * @param mixed  $errors  Detailed validation errors array or object
 * @param int    $code    HTTP Status code (default 400 Bad Request)
 */
function sendError($message = "An error occurred", $errors = null, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => false,
        "message" => $message,
        "errors"  => $errors
    ]);
    exit();
}

/**
 * Helper function to read incoming raw JSON request body sent by React Native fetch calls.
 *
 * @return array Decoded associative array of JSON data
 */
function getJsonInput() {
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true);
    return is_array($data) ? $data : [];
}
