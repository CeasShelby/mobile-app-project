<?php
/**
 * FULL ENDPOINT SIMULATION TEST
 * Tests every backend model function against the live local DB
 * to catch any remaining SQL errors before the app hits them
 */
$host='127.0.0.1'; $db='parent_teacher_app'; $user='root';
$pdo = null;
foreach (['', 'root'] as $pass) {
    try { $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); break; }
    catch(PDOException $e) {}
}
if (!$pdo) die("[ERROR] Cannot connect\n");

// Load all models
require_once __DIR__ . '/../models/user_model.php';
require_once __DIR__ . '/../models/parent_model.php';
require_once __DIR__ . '/../models/teacher_model.php';
require_once __DIR__ . '/../models/student_model.php';
require_once __DIR__ . '/../models/attendance_model.php';
require_once __DIR__ . '/../models/progress_model.php';
require_once __DIR__ . '/../models/announcement_model.php';
require_once __DIR__ . '/../models/message_model.php';

$pass = 0; $fail = 0;

function test($name, $fn) {
    global $pass, $fail;
    try {
        $result = $fn();
        echo "[PASS] $name\n";
        if (is_array($result)) echo "       → " . count($result) . " record(s) returned\n";
        $pass++;
    } catch (Throwable $e) {
        echo "[FAIL] $name\n";
        echo "       → ERROR: " . $e->getMessage() . "\n";
        $fail++;
    }
}

// Get real IDs from DB
$parentUserId = (int)($pdo->query("SELECT u.id FROM users u WHERE u.role='parent' LIMIT 1")->fetchColumn() ?: 12);
$teacherUserId = (int)($pdo->query("SELECT u.id FROM users u WHERE u.role='teacher' LIMIT 1")->fetchColumn() ?: 9);
$adminUserId = (int)($pdo->query("SELECT u.id FROM users u WHERE u.role='admin' LIMIT 1")->fetchColumn() ?: 1);
$studentId = (int)($pdo->query("SELECT id FROM students LIMIT 1")->fetchColumn() ?: 5);
$classId = (int)($pdo->query("SELECT id FROM classes LIMIT 1")->fetchColumn() ?: 1);
$parentId = (int)($pdo->query("SELECT id FROM parents LIMIT 1")->fetchColumn() ?: 4);
$teacherId = (int)($pdo->query("SELECT id FROM teachers LIMIT 1")->fetchColumn() ?: 1);

echo "=== Testing with: parentUser=$parentUserId, teacherUser=$teacherUserId, student=$studentId, class=$classId ===\n\n";

// --- User Model ---
test("findUserById (admin)", fn() => findUserById($pdo, $adminUserId));
test("findUserByEmail", fn() => findUserByEmail($pdo, 'parent1@example.com'));

// --- Parent Model ---
test("findParentByUserId", fn() => findParentByUserId($pdo, $parentUserId));
test("getOrCreateParentId", fn() => getOrCreateParentId($pdo, $parentUserId));
test("getLinkedStudentsForParent", fn() => getLinkedStudentsForParent($pdo, $parentId));
test("verifyParentStudentRelationship", fn() => verifyParentStudentRelationship($pdo, $parentId, $studentId));

// --- Student Model ---
test("getStudentById", fn() => getStudentById($pdo, $studentId));
test("getAllStudents", fn() => getAllStudents($pdo));
test("getLinkedStudentsForParent", fn() => getLinkedStudentsForParent($pdo, $parentId));

// --- Teacher Model ---
test("findTeacherByUserId", fn() => findTeacherByUserId($pdo, $teacherUserId));
test("findTeacherById", fn() => findTeacherById($pdo, $teacherId));
test("getHomeroomTeacherForClass", fn() => getHomeroomTeacherForClass($pdo, $classId));
test("getTeacherAssignedClasses", fn() => getTeacherAssignedClasses($pdo, $teacherId));

// --- Attendance Model ---
test("getAttendanceSummaryStats", fn() => getAttendanceSummaryStats($pdo, $studentId));
test("getAttendanceByStudent", fn() => getAttendanceByStudent($pdo, $studentId, 10));

// --- Progress Model (THE ONE THAT WAS CRASHING) ---
test("getStudentProgress", fn() => getStudentProgress($pdo, $studentId));
test("getStudentAcademicSummary", fn() => getStudentAcademicSummary($pdo, $studentId));

// --- Announcement Model ---
test("getPublishedAnnouncements (parents)", fn() => getPublishedAnnouncements($pdo, 'parents', 5));
test("getPublishedAnnouncements (teachers)", fn() => getPublishedAnnouncements($pdo, 'teachers', 5));
test("getPublishedAnnouncements (all)", fn() => getPublishedAnnouncements($pdo, 'all', 5));

// --- Raw SQL tests for problem tables ---
test("messages table query (message column)", function() use ($pdo) {
    return $pdo->query("SELECT id, message, is_read FROM messages LIMIT 5")->fetchAll();
});
test("messages.message_text generated column", function() use ($pdo) {
    return $pdo->query("SELECT id, message_text, is_read FROM messages LIMIT 5")->fetchAll();
});
test("notifications query", function() use ($pdo, $parentUserId) {
    $s = $pdo->prepare("SELECT id, title, message, type, is_read FROM notifications WHERE recipient_id = ? LIMIT 5");
    $s->execute([$parentUserId]);
    return $s->fetchAll();
});
test("teacher_classes with new columns", function() use ($pdo) {
    return $pdo->query("SELECT id, teacher_id, class_id, academic_period_id, is_homeroom_teacher FROM teacher_classes LIMIT 5")->fetchAll();
});
test("parent_students with relationship_type", function() use ($pdo) {
    return $pdo->query("SELECT id, parent_id, student_id, relationship, relationship_type FROM parent_students LIMIT 5")->fetchAll();
});
test("staff table query", function() use ($pdo) {
    return $pdo->query("SELECT id, user_id, department, designation FROM staff LIMIT 5")->fetchAll();
});
test("assessments table", function() use ($pdo) {
    return $pdo->query("SELECT id, title, assessment_type FROM assessments LIMIT 5")->fetchAll();
});

echo "\n========== RESULTS ==========\n";
echo "PASSED: $pass\n";
echo "FAILED: $fail\n";
if ($fail === 0) {
    echo "\n✅ ALL TESTS PASSED — Backend is clean!\n";
} else {
    echo "\n⚠️  $fail test(s) failed — review errors above\n";
}
