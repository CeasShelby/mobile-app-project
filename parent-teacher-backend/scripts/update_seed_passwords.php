<?php
$host = 'iriguchi.proxy.rlwy.net';
$port = '48790';
$user = 'root';
$pass = 'IfFHwsMVGMcbFeVXpwKjSGvTvOAoLKGG';
$db   = 'parent_teacher_app';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $hash = password_hash('password', PASSWORD_BCRYPT);
    echo "Generated BCrypt Hash: $hash\n";

    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email IN ('admin@example.com', 'teacher@example.com', 'parent@example.com')");
    $stmt->execute([$hash]);

    echo "[SUCCESS] Updated " . $stmt->rowCount() . " user passwords on Railway database to 'password'!\n";
} catch (Exception $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}
