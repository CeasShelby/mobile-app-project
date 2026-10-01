<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=parent_teacher_app;charset=utf8mb4','root','root',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);

echo "=== USERS ===\n";
foreach($pdo->query('SELECT id,email,role FROM users ORDER BY id')->fetchAll() as $r)
    echo "  id={$r['id']} role={$r['role']} email={$r['email']}\n";

echo "\n=== PARENTS ===\n";
foreach($pdo->query('SELECT p.id,p.user_id,u.email FROM parents p JOIN users u ON p.user_id=u.id')->fetchAll() as $r)
    echo "  parent_id={$r['id']} user_id={$r['user_id']} email={$r['email']}\n";

echo "\n=== STUDENTS ===\n";
foreach($pdo->query('SELECT id,full_name,class_id,status FROM students')->fetchAll() as $r)
    echo "  id={$r['id']} name={$r['full_name']} status={$r['status']}\n";

echo "\n=== PARENT_STUDENTS LINKS ===\n";
$links = $pdo->query('SELECT ps.*,s.full_name as sname FROM parent_students ps JOIN students s ON ps.student_id=s.id')->fetchAll();
if (empty($links)) {
    echo "  [NONE] No parent-student links exist!\n";
} else {
    foreach($links as $r)
        echo "  parent_id={$r['parent_id']} -> student_id={$r['student_id']} ({$r['sname']}) relation={$r['relationship']}\n";
}
