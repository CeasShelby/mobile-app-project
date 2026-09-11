<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

// Set response header to JSON format
header('Content-Type: application/json');

// Authenticate: Ensure the user is logged in
$currentUser = authenticate_request();

// Authorization check: Only teachers and admins can create announcements
if ($currentUser['role'] !== 'teacher' && $currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Access denied: Only teachers and administrators can post announcements."]);
    exit();
}

// Read raw JSON data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$title          = isset($data['title']) ? trim($data['title']) : '';
$content        = isset($data['content']) ? trim($data['content']) : '';
$targetAudience = isset($data['target_audience']) ? trim($data['target_audience']) : 'all';

// Validate inputs
if (empty($title) || empty($content)) {
    http_response_code(400);
    echo json_encode(["error" => "Please include both a title and content for the announcement"]);
    exit();
}

if (!in_array($targetAudience, ['all', 'parents', 'teachers'])) {
    $targetAudience = 'all';
}

try {
    // Insert new announcement
    $stmt = $pdo->prepare("
        INSERT INTO announcements (title, content, target_audience, created_by) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$title, $content, $targetAudience, $currentUser['id']]);

    echo json_encode(["message" => "Announcement published successfully", "id" => $pdo->lastInsertId()]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
}
