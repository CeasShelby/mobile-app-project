<?php
// ============================================================
// API System Health & Database Diagnostic Endpoint
// File: parent-teacher-backend/api/health.php
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

try {
    // Perform a test database query to confirm connection health
    $stmt = $pdo->query("SELECT VERSION() as mysql_version, NOW() as server_time");
    $dbInfo = $stmt->fetch();

    sendSuccess([
        "status"         => "healthy",
        "api_version"    => "1.0.0",
        "mysql_version"  => $dbInfo['mysql_version'],
        "server_time"    => $dbInfo['server_time'],
        "environment"    => "Development (Expo + XAMPP)"
    ], "Parent-Teacher API is online and database connection is healthy.");
} catch (Exception $e) {
    sendError("API health check failed: " . $e->getMessage(), null, 500);
}
