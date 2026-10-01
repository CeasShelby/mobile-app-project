<?php
/**
 * Railway Cloud Database Import Script
 * ----------------------------------------------------
 * WHY: PHP 8 handles MySQL 8 caching_sha2_password authentication natively,
 * avoiding client CLI missing DLL issues in older MariaDB binaries.
 * 
 * HOW: Connects to Railway MySQL host using PDO, reads parent_teacher_app.sql,
 * and executes schema & seed data queries.
 */

if ($argc < 2) {
    echo "Usage: C:\\xampp\\php\\php.exe scripts/import_cloud_db.php <RAILWAY_MYSQL_PASSWORD>\n";
    exit(1);
}

$host = 'iriguchi.proxy.rlwy.net';
$port = '48790';
$user = 'root';
$pass = $argv[1];

$sqlFile = __DIR__ . '/../sql/parent_teacher_app.sql';

if (!file_exists($sqlFile)) {
    die("Error: SQL file not found at: $sqlFile\n");
}

echo "========================================================\n";
echo " Connecting to Railway Cloud MySQL ($host:$port)...\n";
echo "========================================================\n";

try {
    // Connect to MySQL server (without specifying DB first so it can create parent_teacher_app)
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
    ];
    
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "[SUCCESS] Connected to Railway MySQL Server!\n\n";

    echo "Reading SQL schema from parent_teacher_app.sql...\n";
    $sql = file_get_contents($sqlFile);

    echo "Executing database migration and table seeding...\n";
    $pdo->exec($sql);

    echo "\n========================================================\n";
    echo " [SUCCESS] Database 'parent_teacher_app' imported cleanly!\n";
    echo " All tables & initial seed records created on Railway.\n";
    echo "========================================================\n";

} catch (PDOException $e) {
    echo "\n[ERROR] Connection or Migration failed:\n";
    echo $e->getMessage() . "\n";
    exit(1);
}
