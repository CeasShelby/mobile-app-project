<?php
/**
 * Root Health Check Endpoint
 * ----------------------------------------------------
 * Returns JSON status confirmation when visiting backend base URL.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config/database.php';

$dbStatus = 'connected';
$dbError = null;

try {
    $stmt = $pdo->query("SELECT 1");
} catch (\Exception $e) {
    $dbStatus = 'failed';
    $dbError = $e->getMessage();
}

echo json_encode([
    'status' => 'success',
    'service' => 'Parent-Teacher Communication API',
    'environment' => 'Production (Render Cloud)',
    'message' => 'Backend API server is running live!',
    'database_status' => $dbStatus,
    'database_error' => $dbError,
    'timestamp' => date('Y-m-d H:i:s T')
], JSON_PRETTY_PRINT);
