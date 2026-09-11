<?php
// Include database configuration and token validation middleware
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth_middleware.php';

header('Content-Type: application/json');

$currentUser = authenticate_request();

try {
    $classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : null;
    $levelFilter = isset($_GET['level']) ? trim($_GET['level']) : null;

    if ($classId && $classId > 0) {
        // Fetch class level to auto-filter subjects
        $cStmt = $pdo->prepare("SELECT class_level FROM classes WHERE id = ?");
        $cStmt->execute([$classId]);
        $cls = $cStmt->fetch();
        if ($cls && !empty($cls['class_level'])) {
            if (strpos($cls['class_level'], "A'Level") !== false) {
                $levelFilter = "A'Level";
            } else if (strpos($cls['class_level'], "O'Level") !== false) {
                $levelFilter = "O'Level";
            }
        }
    }

    if ($levelFilter) {
        $stmt = $pdo->prepare("
            SELECT id, subject_name, subject_code, description, level 
            FROM subjects 
            WHERE level = ? OR level = 'Both'
            ORDER BY subject_name ASC
        ");
        $stmt->execute([$levelFilter]);
    } else {
        $stmt = $pdo->query("SELECT id, subject_name, subject_code, description, level FROM subjects ORDER BY subject_name ASC");
    }

    $subjects = $stmt->fetchAll();
    echo json_encode($subjects ? $subjects : []);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed: " . $e->getMessage()]);
}

