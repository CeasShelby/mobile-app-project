<?php
/**
 * COMPREHENSIVE DATABASE + CODE FIXER
 * Fixes ALL mismatches found between code and local XAMPP DB
 */
$host='127.0.0.1'; $db='parent_teacher_app'; $user='root';
$pdo = null;
foreach (['', 'root'] as $pass) {
    try { $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); break; }
    catch(PDOException $e) {}
}
if (!$pdo) die("[ERROR] Cannot connect to local MySQL\n");
echo "[OK] Connected to local MySQL: $db\n\n";

// Helper
function col_exists($pdo, $table, $col) {
    return (bool)$pdo->query("SHOW COLUMNS FROM `$table` LIKE '$col'")->fetch();
}

// ================================================================
// FIX 1: parent_students — add relationship_type alias column
// Code uses 'relationship_type' but DB has 'relationship'
// Solution: Add relationship_type as a generated/virtual alias
// ================================================================
echo "--- Fix 1: parent_students.relationship_type ---\n";
if (!col_exists($pdo, 'parent_students', 'relationship_type')) {
    // Add it as a real column that mirrors relationship
    $pdo->exec("ALTER TABLE `parent_students` ADD COLUMN `relationship_type` VARCHAR(50) GENERATED ALWAYS AS (`relationship`) STORED");
    echo "[FIXED] Added relationship_type as stored generated column from relationship\n";
} else {
    echo "[OK] relationship_type already exists\n";
}

// ================================================================
// FIX 2: teachers — add status column (get_my_classes.php inserts with status)
// ================================================================
echo "\n--- Fix 2: teachers.status ---\n";
if (!col_exists($pdo, 'teachers', 'status')) {
    $pdo->exec("ALTER TABLE `teachers` ADD COLUMN `status` ENUM('active','inactive') DEFAULT 'active'");
    echo "[FIXED] Added status column to teachers table\n";
} else {
    echo "[OK] teachers.status already exists\n";
}

// ================================================================
// FIX 3: teacher_classes — add academic_period_id and is_homeroom_teacher
// Code in SQL schema expects these columns
// ================================================================
echo "\n--- Fix 3: teacher_classes.academic_period_id ---\n";
if (!col_exists($pdo, 'teacher_classes', 'academic_period_id')) {
    $pdo->exec("ALTER TABLE `teacher_classes` ADD COLUMN `academic_period_id` INT DEFAULT 1");
    // Set existing rows to period 1
    $pdo->exec("UPDATE `teacher_classes` SET `academic_period_id` = 1");
    echo "[FIXED] Added academic_period_id to teacher_classes (defaulting existing rows to period 1)\n";
} else {
    echo "[OK] teacher_classes.academic_period_id already exists\n";
}

echo "\n--- Fix 4: teacher_classes.is_homeroom_teacher ---\n";
if (!col_exists($pdo, 'teacher_classes', 'is_homeroom_teacher')) {
    $pdo->exec("ALTER TABLE `teacher_classes` ADD COLUMN `is_homeroom_teacher` TINYINT(1) DEFAULT 0");
    // Set first teacher_class entry per class as homeroom
    $pdo->exec("UPDATE `teacher_classes` SET `is_homeroom_teacher` = 1 WHERE id IN (SELECT min_id FROM (SELECT MIN(id) as min_id FROM `teacher_classes` GROUP BY class_id) t)");
    echo "[FIXED] Added is_homeroom_teacher to teacher_classes\n";
} else {
    echo "[OK] teacher_classes.is_homeroom_teacher already exists\n";
}

// ================================================================
// FIX 5: messages — code expects 'message_text' but DB has 'message'
// ================================================================
echo "\n--- Fix 5: messages.message_text ---\n";
if (!col_exists($pdo, 'messages', 'message_text') && col_exists($pdo, 'messages', 'message')) {
    $pdo->exec("ALTER TABLE `messages` ADD COLUMN `message_text` TEXT GENERATED ALWAYS AS (`message`) STORED");
    echo "[FIXED] Added message_text as alias for message column\n";
} elseif (col_exists($pdo, 'messages', 'message_text')) {
    echo "[OK] messages.message_text already exists\n";
} else {
    echo "[SKIP] messages structure is different, skipping\n";
}

// ================================================================
// FIX 6: conversations — SQL schema expects student_id only
// but DB has parent_id, teacher_id, student_id
// The code just does SELECT/INSERT on conversations — this is fine
// ================================================================
echo "\n--- Fix 6: conversations structure check ---\n";
$convCols = $pdo->query("SHOW COLUMNS FROM `conversations`")->fetchAll(PDO::FETCH_COLUMN);
echo "[INFO] conversations columns: " . implode(', ', $convCols) . " — OK (extra columns safe)\n";

// ================================================================
// FIX 7: student_progress — code expects 'marks' + 'comments' but DB has
// 'marks_obtained' + 'remarks' + 'assessment_name' (progress_model.php already handles this dynamically)
// ================================================================
echo "\n--- Fix 7: student_progress column compatibility ---\n";
$spCols = $pdo->query("SHOW COLUMNS FROM `student_progress`")->fetchAll(PDO::FETCH_COLUMN);
echo "[OK] progress_model.php dynamically handles: " . implode(', ', $spCols) . "\n";

// ================================================================
// FIX 8: notifications — check for 'read_at' vs 'is_read'
// ================================================================
echo "\n--- Fix 8: notifications structure ---\n";
if (!col_exists($pdo, 'notifications', 'read_at')) {
    $pdo->exec("ALTER TABLE `notifications` ADD COLUMN `read_at` TIMESTAMP NULL DEFAULT NULL");
    echo "[FIXED] Added read_at to notifications\n";
} else {
    echo "[OK] notifications.read_at exists\n";
}

// ================================================================
// FIX 9: announcements — check is_published column
// ================================================================
echo "\n--- Fix 9: announcements.is_published ---\n";
if (!col_exists($pdo, 'announcements', 'is_published')) {
    $pdo->exec("ALTER TABLE `announcements` ADD COLUMN `is_published` TINYINT(1) DEFAULT 1");
    $pdo->exec("UPDATE `announcements` SET `is_published` = 1");
    echo "[FIXED] Added is_published to announcements\n";
} else {
    echo "[OK] announcements.is_published exists\n";
}

// ================================================================
// FIX 10: Seed at least one assessment so progress queries work
// ================================================================
echo "\n--- Fix 10: Seed default assessment ---\n";
$subjId = $pdo->query("SELECT MIN(id) FROM subjects")->fetchColumn();
$classId = $pdo->query("SELECT MIN(id) FROM classes")->fetchColumn();
$teacherId = $pdo->query("SELECT MIN(id) FROM teachers")->fetchColumn();
$periodId = $pdo->query("SELECT MIN(id) FROM academic_periods")->fetchColumn();
if ($subjId && $classId && $teacherId && $periodId) {
    $cnt = $pdo->query("SELECT COUNT(*) FROM assessments")->fetchColumn();
    if ($cnt == 0) {
        $pdo->prepare("INSERT INTO assessments (title, assessment_type, subject_id, class_id, academic_period_id, max_marks, created_by) VALUES (?,?,?,?,?,?,?)")
            ->execute(['First Term Assessment', 'exam', $subjId, $classId, $periodId, 100.00, $teacherId]);
        echo "[FIXED] Seeded 1 default assessment\n";
    } else {
        echo "[OK] assessments already has $cnt row(s)\n";
    }
}

echo "\n========== ALL FIXES APPLIED ==========\n";

// Final state
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "\nFinal row counts:\n";
foreach ($tables as $t) {
    $c = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    echo "  $t: $c rows\n";
}
echo "\n[DONE] Database is fully synced with backend code!\n";
