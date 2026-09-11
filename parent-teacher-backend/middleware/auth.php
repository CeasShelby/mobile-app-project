<?php
// ============================================================
// Authentication & Role Authorization Middleware
// File: parent-teacher-backend/middleware/auth.php
// ============================================================

require_once __DIR__ . '/../jwt_helper.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Require a valid JWT authentication token for protected endpoints.
 *
 * @return array The authenticated user payload (id, email, role, etc.)
 */
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

function requireAuth($allowedRoles = []) {
    $headers = getallheaders();
    
    // Check Authorization header in case-insensitive manner
    $authHeader = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }

    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        sendError("Authentication token required. Please log in.", null, 401);
    }

    $jwtToken = $matches[1];
    $userPayload = JWTHelper::verify_jwt($jwtToken);

    if (!$userPayload) {
        sendError("Invalid or expired authentication session. Please log in again.", null, 401);
    }

    return $userPayload;
}

/**
 * Require a specific system role (e.g. 'admin', 'teacher', 'parent') or list of allowed roles.
 *
 * @param string|array $allowedRoles Single role string or array of allowed roles
 * @return array The authenticated user payload
 */
function requireRole($allowedRoles) {
    $userPayload = requireAuth();
    $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];

    if (!in_array($userPayload['role'], $roles)) {
        sendError("Access denied. You do not have permission to perform this action.", null, 403);
    }

    return $userPayload;
}
