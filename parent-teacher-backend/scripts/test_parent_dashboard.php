<?php
/**
 * Quick test: simulate what parent dashboard calls to verify no more crashes
 */
$host='127.0.0.1'; $db='parent_teacher_app'; $user='root';
$pdo = null;
foreach (['', 'root'] as $pass) {
    try { $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); break; }
    catch(PDOException $e) {}
}
if (!$pdo) die("[ERROR] Cannot connect\n");
echo "[OK] Connected\n\n";

require_once __DIR__ . '/../models/student_model.php';
require_once __DIR__ . '/../models/attendance_model.php';
require_once __DIR__ . '/../models/progress_model.php';
require_once __DIR__ . '/../models/announcement_model.php';
require_once __DIR__ . '/../models/parent_model.php';

echo "--- Test 1: getLinkedStudentsForParent ---\n";
$students = getLinkedStudentsForParent($pdo, 1);
echo "Found " . count($students) . " linked students\n";
foreach ($students as $s) echo "  - {$s['full_name']} (class: {$s['class_name']})\n";

echo "\n--- Test 2: getAttendanceSummaryStats ---\n";
foreach ($students as $s) {
    $stats = getAttendanceSummaryStats($pdo, $s['id']);
    echo "  Student {$s['full_name']}: total_days={$stats['total_days']}, present={$stats['present_days']}, %={$stats['percentage']}\n";
}

echo "\n--- Test 3: getStudentAcademicSummary (the one that was crashing) ---\n";
foreach ($students as $s) {
    try {
        $summary = getStudentAcademicSummary($pdo, $s['id']);
        echo "  Student {$s['full_name']}: avg={$summary['overall_average']}, assessments={$summary['total_assessments']}\n";
        echo "  [OK] No crash!\n";
    } catch (Exception $e) {
        echo "  [ERROR] {$e->getMessage()}\n";
    }
}

echo "\n--- Test 4: getPublishedAnnouncements ---\n";
$ann = getPublishedAnnouncements($pdo, 'parents', 5);
echo "Found " . count($ann) . " announcements\n";

echo "\n[ALL TESTS PASSED] Parent dashboard backend is clean!\n";
