<?php
// Quick local DB diagnostic - run this while XAMPP is on
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
echo json_encode([
    'db_connected' => isset($pdo),
    'total_users'    => (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'total_students' => (int)$pdo->query("SELECT COUNT(*) FROM students")->fetchColumn(),
    'total_teachers' => (int)$pdo->query("SELECT COUNT(*) FROM teachers")->fetchColumn(),
    'total_parents'  => (int)$pdo->query("SELECT COUNT(*) FROM parents")->fetchColumn(),
    'total_classes'  => (int)$pdo->query("SELECT COUNT(*) FROM classes")->fetchColumn(),
    'db_name'        => $pdo->query("SELECT DATABASE()")->fetchColumn(),
    'users_list'     => $pdo->query("SELECT id, email, role FROM users LIMIT 10")->fetchAll(),
], JSON_PRETTY_PRINT);
