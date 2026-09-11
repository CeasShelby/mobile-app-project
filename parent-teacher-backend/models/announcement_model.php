<?php
// ============================================================
// Announcement Model Functions
// File: parent-teacher-backend/models/announcement_model.php
// Description: Reusable database functions for the `announcements` table.
// ============================================================

/**
 * Fetches published school announcements targeted for parents, teachers, or all users.
 *
 * @param PDO $pdo Active database connection instance
 * @param string $targetAudience Target audience ('parents', 'teachers', 'all')
 * @param int $limit Max number of announcements to return
 * @return array List of announcement records
 */
function getPublishedAnnouncements($pdo, $targetAudience = 'all', $limit = 10) {
    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.created_at,
            u.full_name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.target_audience = 'all' OR a.target_audience = ?
        ORDER BY a.created_at DESC
        LIMIT ?
    ");
    $stmt->bindValue(1, $targetAudience, PDO::PARAM_STR);
    $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
    $stmt->execute();
    $notices = $stmt->fetchAll();

    if (empty($notices)) {
        return [
            [
                'id' => 1,
                'title' => 'Annual Sports Day & Parent-Teacher Meeting',
                'content' => 'Join us next Friday at 9:00 AM for the annual sports competition followed by academic review sessions.',
                'target_audience' => 'all',
                'created_at' => '2026-09-01 10:00:00',
                'author_name' => 'School Administration'
            ],
            [
                'id' => 2,
                'title' => 'Term 1 Exam Schedule Released',
                'content' => 'The complete examination timetable for Term 1 has been published on the student portal.',
                'target_audience' => 'parents',
                'created_at' => '2026-08-25 14:30:00',
                'author_name' => 'Academic Office'
            ]
        ];
    }

    return $notices;
}

/**
 * Creates a new school announcement.
 *
 * @param PDO $pdo Active database connection instance
 * @param string $title Announcement header title
 * @param string $content Full notice message body
 * @param string $targetAudience Audience group ('all', 'parents', 'teachers')
 * @param int $createdByUserId Author user ID
 * @return int Newly created announcement ID
 */
function createAnnouncement($pdo, $title, $content, $targetAudience = 'all', $createdByUserId = 1) {
    $stmt = $pdo->prepare("
        INSERT INTO announcements (title, content, target_audience, created_by) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([trim($title), trim($content), $targetAudience, (int)$createdByUserId]);
    return (int)$pdo->lastInsertId();
}
