<?php
try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=parent_teacher_app;charset=utf8mb4", "root", "root", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "========================================================\n";
    echo " LOCAL XAMPP DATABASE VERIFICATION REPORT\n";
    echo "========================================================\n";
    echo "Users Count:    " . $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn() . "\n";
    echo "Students Count: " . $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn() . "\n";
    echo "Teachers Count: " . $pdo->query("SELECT COUNT(*) FROM teachers")->fetchColumn() . "\n";
    echo "Parents Count:  " . $pdo->query("SELECT COUNT(*) FROM parents")->fetchColumn() . "\n";
    echo "Classes Count:  " . $pdo->query("SELECT COUNT(*) FROM classes")->fetchColumn() . "\n";
    echo "========================================================\n";
} catch (PDOException $e) {
    echo "Local DB Connection Error: " . $e->getMessage() . "\n";
}
