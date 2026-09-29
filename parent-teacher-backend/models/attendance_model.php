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
 */
function getAttendanceSummaryStats($pdo, $studentId) {
    // 1. HOW: Prepare SQL aggregate query
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as percentage
        FROM attendance
        WHERE student_id = ?
    ");
    // 2. HOW: Bind student ID safely and execute query
    $stmt->execute([(int)$studentId]);
    $res = $stmt->fetch();

    // 3. WHAT: Return structured associative array with type formatting
    return [
        'total_days'   => (int)($res['total_days'] ?? 0),
        'present_days' => (int)($res['present_days'] ?? 0),
        'absent_days'  => (int)($res['absent_days'] ?? 0),
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
function recordAttendance($pdo, $studentId, $classId, $date, $status, $recordedByUserId = null) {
    $stmt = $pdo->prepare("
        INSERT INTO attendance (student_id, class_id, date, status, recorded_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_by = VALUES(recorded_by)
    ");
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
function getStudentAttendanceHistory($pdo, $studentId, $startDate = null, $endDate = null) {
    $sql = "SELECT id, date, status, remark FROM attendance WHERE student_id = ?";
    $params = [(int)$studentId];

    if ($startDate) {
        $sql .= " AND date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND date <= ?";
        $params[] = $endDate;
    }

    $sql .= " ORDER BY date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}
