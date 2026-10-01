<?php
/**
 * FULL BACKEND AUDIT SCRIPT
 * Connects to local XAMPP MySQL and audits ALL table/column mismatches
 * between what the code expects vs what actually exists in the database
 */
$host='127.0.0.1'; $db='parent_teacher_app'; $user='root';
$pdo = null;
foreach (['', 'root'] as $pass) {
    try { $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); break; }
    catch(PDOException $e) {}
}
if (!$pdo) die("[ERROR] Cannot connect to local MySQL\n");
echo "[OK] Connected to local MySQL database: $db\n\n";

// Get all tables and columns
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$schema = [];
foreach ($tables as $t) {
    $cols = $pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN);
    $schema[$t] = $cols;
    echo "TABLE $t: " . implode(', ', $cols) . "\n";
}

echo "\n========== AUDITING COLUMN MISMATCHES ==========\n";
$issues = [];

// --- users table ---
if (isset($schema['users'])) {
    if (!in_array('phone_number', $schema['users']) && in_array('phone', $schema['users'])) {
        $issues[] = "MISMATCH: `users`.`phone_number` doesn't exist — column is actually `phone`";
    }
    if (in_array('phone_number', $schema['users'])) echo "[OK] users.phone_number exists\n";
    if (in_array('phone', $schema['users'])) echo "[NOTE] users.phone exists (code may need phone_number)\n";
}

// --- students table ---
if (isset($schema['students'])) {
    $s = $schema['students'];
    if (!in_array('full_name', $s) && (in_array('first_name', $s) || in_array('last_name', $s)))
        $issues[] = "MISMATCH: `students`.`full_name` missing — has first_name/last_name instead";
    if (!in_array('admission_number', $s))
        $issues[] = "MISMATCH: `students`.`admission_number` missing";
    if (!in_array('combination', $s))
        $issues[] = "INFO: `students`.`combination` missing (may cause insert errors)";
    if (!in_array('student_number', $s))
        $issues[] = "INFO: `students`.`student_number` missing (used in manage_students.php INSERT)";
    if (!in_array('status', $s))
        $issues[] = "MISMATCH: `students`.`status` missing";
    echo "[OK] students table columns: " . implode(', ', $s) . "\n";
}

// --- parent_students table ---
if (isset($schema['parent_students'])) {
    $ps = $schema['parent_students'];
    if (!in_array('relationship_type', $ps) && in_array('relationship', $ps))
        $issues[] = "MISMATCH: `parent_students`.`relationship_type` missing — column is `relationship`";
    if (in_array('relationship_type', $ps)) echo "[OK] parent_students.relationship_type exists\n";
    if (in_array('relationship', $ps)) echo "[NOTE] parent_students.relationship exists\n";
}

// --- teachers table ---
if (isset($schema['teachers'])) {
    $t = $schema['teachers'];
    if (!in_array('employee_number', $t))
        $issues[] = "MISMATCH: `teachers`.`employee_number` missing";
    if (!in_array('status', $t))
        $issues[] = "INFO: `teachers`.`status` missing (get_my_classes.php inserts with status)";
    echo "[OK] teachers table columns: " . implode(', ', $t) . "\n";
}

// --- classes table ---
if (isset($schema['classes'])) {
    $c = $schema['classes'];
    if (!in_array('class_level', $c))
        $issues[] = "INFO: `classes`.`class_level` missing (manage_students.php uses it in INSERT)";
    if (!in_array('academic_year', $c))
        $issues[] = "INFO: `classes`.`academic_year` missing (manage_students.php uses it in INSERT)";
    echo "[OK] classes table columns: " . implode(', ', $c) . "\n";
}

// --- staff table ---
if (!isset($schema['staff'])) {
    $issues[] = "MISSING TABLE: `staff` — manage_staff.php queries this table";
} else {
    echo "[OK] staff table exists\n";
}

// --- teacher_classes table ---
if (isset($schema['teacher_classes'])) {
    $tc = $schema['teacher_classes'];
    if (!in_array('academic_period_id', $tc))
        $issues[] = "MISMATCH: `teacher_classes`.`academic_period_id` missing";
    if (!in_array('is_homeroom_teacher', $tc))
        $issues[] = "MISMATCH: `teacher_classes`.`is_homeroom_teacher` missing";
    echo "[OK] teacher_classes columns: " . implode(', ', $tc) . "\n";
}

// Check student_progress
if (isset($schema['student_progress'])) {
    $sp = $schema['student_progress'];
    echo "[OK] student_progress columns: " . implode(', ', $sp) . "\n";
}

echo "\n========== ISSUES FOUND ==========\n";
if (empty($issues)) {
    echo "[CLEAN] No critical issues found!\n";
} else {
    foreach ($issues as $i => $issue) {
        echo ($i+1) . ". $issue\n";
    }
}

// Count rows in each table
echo "\n========== ROW COUNTS ==========\n";
foreach ($tables as $t) {
    $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    echo "  $t: $count rows\n";
}
echo "\nAudit complete.\n";
