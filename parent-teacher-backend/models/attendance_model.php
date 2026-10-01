<?php
// ============================================================
// Attendance Model Functions
// File: parent-teacher-backend/models/attendance_model.php
//
// 🎯 WHY THIS FILE EXISTS:
// Manages all roll-call attendance logging, daily attendance records,
// and automated percentage aggregate calculations.
//
// 💡 WHAT IT DOES:
// Calculates student attendance percentage, present vs absent days,
// records batch class roll-calls, and retrieves attendance history logs.
//
// ⚙️ HOW IT WORKS:
// Uses SQL Aggregate functions (COUNT, SUM, CASE WHEN, ROUND) executed
// via PDO Prepared Statements for high-performance statistical summaries.
// ============================================================

/**
 * Calculates summary attendance statistics for a specific student.
 *
 * WHY: Parent Dashboard & Progress report cards display live attendance %.
 * WHAT: Calculates total days, present days, absent days, and percentage.
 * HOW: Uses SQL SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) aggregate.
 *
 * @param PDO $pdo Active database connection instance
 * @param int $studentId The ID number of the student
 * @return array Formatted summary array (total_days, present_days, absent_days, percentage)
 */
// Define function named 'getAttendanceSummaryStats' receiving database object ($pdo) and student ID ($studentId)
function getAttendanceSummaryStats($pdo, $studentId) {

    // Line 1: Prepare SQL aggregate query template on database server to prevent SQL injection attacks
    // COUNT(*) -> Counts total attendance entries for this student
    // SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) -> Adds 1 for each present day, 0 for absent
    // SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) -> Adds 1 for each absent day
    // ROUND(((present / total) * 100), 1) -> Calculates attendance percentage rounded to 1 decimal place
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as percentage
        FROM attendance
        WHERE student_id = ?
    ");

    // Line 2: Bind $studentId safely into placeholder '?' (cast to integer number for safety) and execute on MySQL server
    $stmt->execute([(int)$studentId]);

    // Line 3: Fetch single resulting row from query as an associative array stored in variable $res
    $res = $stmt->fetch();

    // Line 4: Return associative array with explicit data type casting (int and float)
    // If $res fields are null (no attendance logged yet), default to 0 days and 100.0%
    return [
        // Cast total_days string from database into an integer number (default 0)
        'total_days'   => (int)($res['total_days'] ?? 0),

        // Cast present_days string from database into an integer number (default 0)
        'present_days' => (int)($res['present_days'] ?? 0),

        // Cast absent_days string from database into an integer number (default 0)
        'absent_days'  => (int)($res['absent_days'] ?? 0),

        // Cast percentage string from database into a float decimal number (default 100.0)
        'percentage'   => (float)($res['percentage'] ?? 100.0)
    ];
}

/**
 * Records or updates attendance for a single student on a specific date.
 *
 * WHY: Teacher roll call screen logging.
 * WHAT: Inserts or updates attendance record for (student_id, date).
 * HOW: Uses ON DUPLICATE KEY UPDATE to overwrite existing record if re-submitted.
 */
// Define function named 'recordAttendance' accepting inputs for student, class, date, status, and teacher ID
function recordAttendance($pdo, $studentId, $classId, $date, $status, $recordedByUserId = null) {

    // Line 1: Prepare SQL INSERT query template
    // ON DUPLICATE KEY UPDATE -> If a record for this (student_id, date) already exists, update its status instead of crashing
    $stmt = $pdo->prepare("
        INSERT INTO attendance (student_id, class_id, attendance_date, status, recorded_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_by = VALUES(recorded_by)
    ");

    // Line 2: Execute SQL query by binding parameters in exact order:
    // 1. student_id -> (int)$studentId
    // 2. class_id   -> $classId ? (int)$classId : null (converts to integer or null)
    // 3. date       -> $date (e.g. '2026-09-29')
    // 4. status     -> $status (e.g. 'present', 'absent', 'late')
    // 5. recorded_by -> $recordedByUserId (user ID of teacher taking roll call)
    return $stmt->execute([
        (int)$studentId,
        $classId ? (int)$classId : null,
        $date,
        $status,
        $recordedByUserId ? (int)$recordedByUserId : null
    ]);
}

/**
 * Fetches attendance log history for a student between optional date range.
 *
 * WHY: Parent Attendance History tab view.
 * WHAT: Retrieves date, status ('present', 'absent', 'late'), and remark.
 * HOW: Returns chronological array sorted by date DESC.
 */
// Define function named 'getStudentAttendanceHistory' accepting optional start and end filter dates
function getStudentAttendanceHistory($pdo, $studentId, $startDate = null, $endDate = null) {

    // Line 1: Initialize base SQL query string variable named $sql with WHERE student_id = ?
    $sql = "SELECT id, attendance_date, status, remarks FROM attendance WHERE student_id = ?";

    // Line 2: Initialize parameters array named $params with integer-casted $studentId
    $params = [(int)$studentId];

    // Line 3: Check IF a $startDate filter was provided by caller
    if ($startDate) {
        // Line 4: Append " AND date >= ?" string to our SQL query
        $sql .= " AND attendance_date >= ?";
        // Line 5: Push $startDate value into $params array
        $params[] = $startDate;
    }

    // Line 6: Check IF an $endDate filter was provided by caller
    if ($endDate) {
        // Line 7: Append " AND date <= ?" string to our SQL query
        $sql .= " AND attendance_date <= ?";
        // Line 8: Push $endDate value into $params array
        $params[] = $endDate;
    }

    // Line 9: Append ORDER BY clause to sort history with most recent dates at the top
    $sql .= " ORDER BY attendance_date DESC";

    // Line 10: Prepare final dynamically constructed SQL query on database server
    $stmt = $pdo->prepare($sql);

    // Line 11: Execute query with our array of parameter values
    $stmt->execute($params);

    // Line 12: Fetch and return ALL matching attendance log rows as an associative array
    return $stmt->fetchAll();
}

/**
 * Alias for getStudentAttendanceHistory — used by student_profile.php
 * Fetches attendance records for a student with optional limit.
 *
 * @param PDO $pdo Active database connection
 * @param int $studentId Student primary key ID
 * @param int $limit Maximum number of records to return
 * @return array Attendance log records
 */
function getAttendanceByStudent($pdo, $studentId, $limit = 50) {
    $limit = max(1, (int)$limit); // safe integer cast
    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.attendance_date,
            a.status,
            a.remarks,
            a.class_id,
            COALESCE(u.full_name, 'System') as recorded_by_name
        FROM attendance a
        LEFT JOIN teachers t ON a.recorded_by = t.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC
        LIMIT $limit
    ");
    $stmt->execute([(int)$studentId]);
    return $stmt->fetchAll();
}
