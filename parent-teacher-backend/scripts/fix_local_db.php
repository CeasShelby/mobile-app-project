<?php
/**
 * Fix Missing Tables Script
 * Connects to local XAMPP MySQL and creates any missing tables
 * without touching existing data.
 */

// Local XAMPP connection
$host    = '127.0.0.1';
$db      = 'parent_teacher_app';
$user    = 'root';
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

// Try connecting with empty password first (default XAMPP), then 'root'
$pdo = null;
foreach (['', 'root'] as $pass) {
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, $options);
        echo "[OK] Connected to local MySQL as root (password: " . ($pass ? "'root'" : "empty") . ")\n";
        break;
    } catch (PDOException $e) {
        // try next password
    }
}

if (!$pdo) {
    die("[ERROR] Could not connect to local MySQL. Is XAMPP running?\n");
}

// Check what tables currently exist
$existing = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "\n[INFO] Tables currently in database:\n";
foreach ($existing as $t) echo "  - $t\n";
echo "\n";

// --- Fix 1: Create academic_periods if missing ---
if (!in_array('academic_periods', $existing)) {
    $pdo->exec("CREATE TABLE `academic_periods` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `academic_year` VARCHAR(20) NOT NULL,
        `term_name` VARCHAR(50) NOT NULL,
        `start_date` DATE NOT NULL,
        `end_date` DATE NOT NULL,
        `is_active` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_academic_term` (`academic_year`, `term_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "[FIXED] Created missing table: academic_periods\n";

    $pdo->exec("INSERT IGNORE INTO `academic_periods` (`id`,`academic_year`,`term_name`,`start_date`,`end_date`,`is_active`)
                VALUES (1,'2026','Term 1','2026-01-10','2026-12-15',1)");
    echo "[FIXED] Seeded default academic period (2026 Term 1)\n";
} else {
    echo "[OK] Table academic_periods already exists\n";
    // Make sure at least one period exists
    $count = $pdo->query("SELECT COUNT(*) FROM academic_periods")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("INSERT INTO `academic_periods` (`id`,`academic_year`,`term_name`,`start_date`,`end_date`,`is_active`)
                    VALUES (1,'2026','Term 1','2026-01-10','2026-12-15',1)");
        echo "[FIXED] Seeded missing academic period\n";
    }
}

// --- Fix 2: Create assessments if missing ---
if (!in_array('assessments', $existing)) {
    $pdo->exec("CREATE TABLE `assessments` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `assessment_type` ENUM('exam','quiz','homework','project') DEFAULT 'quiz',
        `subject_id` INT NOT NULL,
        `class_id` INT NOT NULL,
        `academic_period_id` INT NOT NULL,
        `max_marks` DECIMAL(5,2) DEFAULT 100.00,
        `weightage_percent` DECIMAL(5,2) DEFAULT 0.00,
        `created_by` INT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`academic_period_id`) REFERENCES `academic_periods`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`created_by`) REFERENCES `teachers`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "[FIXED] Created missing table: assessments\n";
} else {
    echo "[OK] Table assessments already exists\n";
}

// --- Fix 3: Create audit_logs if missing ---
if (!in_array('audit_logs', $existing)) {
    $pdo->exec("CREATE TABLE `audit_logs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT DEFAULT NULL,
        `action` VARCHAR(100) NOT NULL,
        `target_table` VARCHAR(100) DEFAULT NULL,
        `record_id` INT DEFAULT NULL,
        `details_json` TEXT DEFAULT NULL,
        `ip_address` VARCHAR(45) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "[FIXED] Created missing table: audit_logs\n";
} else {
    echo "[OK] Table audit_logs already exists\n";
}

// --- Final: Count all table rows ---
echo "\n[INFO] Current database row counts:\n";
$tables = ['users','teachers','parents','students','classes','subjects','parent_students',
           'teacher_classes','teacher_subjects','attendance','academic_periods',
           'assessments','student_progress','conversations','messages','notifications','announcements'];
foreach ($tables as $t) {
    if (in_array($t, $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN))) {
        $c = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        echo "  $t: $c rows\n";
    } else {
        echo "  $t: [MISSING]\n";
    }
}

echo "\n[DONE] All fixes applied successfully!\n";
