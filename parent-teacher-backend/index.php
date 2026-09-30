<?php
/**
 * Root Health Check Endpoint
 * ----------------------------------------------------
 * Returns JSON status confirmation when visiting backend base URL.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'success',
    'service' => 'Parent-Teacher Communication API',
    'environment' => 'Production (Render Cloud)',
    'message' => 'Backend API server is running live and connected!',
    'timestamp' => date('Y-m-d H:i:s T'),
    'documentation' => [
        'auth_login' => '/api/auth/login.php',
        'parent_dashboard' => '/api/parent/dashboard.php',
        'teacher_dashboard' => '/api/teacher/dashboard.php'
    ]
], JSON_PRETTY_PRINT);
