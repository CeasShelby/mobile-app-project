-- ============================================================
-- PATCH: Create missing tables that may not exist in local XAMPP DB
-- Run this in MySQL Workbench or phpMyAdmin on your local database
-- This is SAFE — uses CREATE TABLE IF NOT EXISTS so existing data is untouched
-- ============================================================

USE `parent_teacher_app`;

-- Create assessments table if it doesn't already exist
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `assessment_type` ENUM('exam', 'quiz', 'homework', 'project') DEFAULT 'quiz',
  `subject_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `academic_period_id` INT NOT NULL,
  `max_marks` DECIMAL(5,2) DEFAULT 100.00,
  `weightage_percent` DECIMAL(5,2) DEFAULT 0.00,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`academic_period_id`) REFERENCES `academic_periods` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create academic_periods table if it doesn't already exist
CREATE TABLE IF NOT EXISTS `academic_periods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year` VARCHAR(20) NOT NULL,
  `term_name` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_active` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_academic_term` (`academic_year`, `term_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure at least one active academic period exists
INSERT IGNORE INTO `academic_periods` (`id`, `academic_year`, `term_name`, `start_date`, `end_date`, `is_active`)
VALUES (1, '2026', 'Term 1', '2026-01-10', '2026-12-15', 1);

-- Seed sample assessments if none exist
INSERT IGNORE INTO `assessments` (`id`, `title`, `assessment_type`, `subject_id`, `class_id`, `academic_period_id`, `max_marks`, `created_by`)
SELECT 1, 'Algebra Quiz 1', 'quiz', s.id, c.id, 1, 100.00, t.id
FROM subjects s, classes c, teachers t
WHERE s.subject_code = 'MATH101' AND c.id = (SELECT MIN(id) FROM classes) AND t.id = (SELECT MIN(id) FROM teachers)
AND NOT EXISTS (SELECT 1 FROM assessments WHERE id = 1)
LIMIT 1;

SELECT 'Tables created/verified successfully!' as status;
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'parent_teacher_app' ORDER BY TABLE_NAME;
