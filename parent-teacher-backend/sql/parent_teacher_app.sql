-- ============================================================
-- Parent–Teacher Communication App — Production Database Schema
-- Database Engine: MySQL 8 (InnoDB Engine with Foreign Keys)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `parent_teacher_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `parent_teacher_app`;

-- Disable Foreign Key checks during table teardown
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversation_participants`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `student_progress`;
DROP TABLE IF EXISTS `assessments`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `teacher_subjects`;
DROP TABLE IF EXISTS `teacher_classes`;
DROP TABLE IF EXISTS `parent_students`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `academic_periods`;
DROP TABLE IF EXISTS `parents`;
DROP TABLE IF EXISTS `teachers`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL, -- Bcrypt hash
  `full_name` VARCHAR(255) NOT NULL,
  `phone_number` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('admin', 'teacher', 'parent') NOT NULL,
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `profile_picture` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. TEACHERS TABLE
-- ------------------------------------------------------------
CREATE TABLE `teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `employee_number` VARCHAR(50) NOT NULL UNIQUE,
  `qualification` VARCHAR(255) DEFAULT NULL,
  `specialization` VARCHAR(255) DEFAULT NULL,
  `hire_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. PARENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `parents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `occupation` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `emergency_contact` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. ACADEMIC PERIODS TABLE
-- ------------------------------------------------------------
CREATE TABLE `academic_periods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year` VARCHAR(20) NOT NULL, -- e.g. "2026"
  `term_name` VARCHAR(50) NOT NULL,     -- e.g. "Term 1"
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_active` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_academic_term` (`academic_year`, `term_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. CLASSES TABLE
-- ------------------------------------------------------------
CREATE TABLE `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_name` VARCHAR(100) NOT NULL UNIQUE, -- e.g. "Grade 5A"
  `grade_level` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. SUBJECTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject_code` VARCHAR(20) NOT NULL UNIQUE, -- e.g. "MATH101"
  `subject_name` VARCHAR(100) NOT NULL,       -- e.g. "Mathematics"
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. STUDENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admission_number` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `gender` ENUM('male', 'female', 'other') NOT NULL,
  `class_id` INT DEFAULT NULL,
  `status` ENUM('active', 'graduated', 'transferred') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  INDEX `idx_students_class` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. PARENT_STUDENTS JUNCTION TABLE (Many-to-Many)
-- ------------------------------------------------------------
CREATE TABLE `parent_students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `relationship_type` ENUM('father', 'mother', 'guardian') DEFAULT 'guardian',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_parent_student` (`parent_id`, `student_id`),
  FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. TEACHER_CLASSES JUNCTION TABLE
-- ------------------------------------------------------------
CREATE TABLE `teacher_classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `academic_period_id` INT NOT NULL,
  `is_homeroom_teacher` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_teacher_class_period` (`teacher_id`, `class_id`, `academic_period_id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`academic_period_id`) REFERENCES `academic_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. TEACHER_SUBJECTS JUNCTION TABLE
-- ------------------------------------------------------------
CREATE TABLE `teacher_subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_teacher_subject_class` (`teacher_id`, `subject_id`, `class_id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. ATTENDANCE TABLE
-- ------------------------------------------------------------
CREATE TABLE `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('present', 'absent', 'late', 'excused') NOT NULL,
  `remarks` TEXT DEFAULT NULL,
  `recorded_by` INT DEFAULT NULL, -- References teachers.id
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_date` (`student_id`, `attendance_date`),
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  INDEX `idx_attendance_lookup` (`student_id`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. ASSESSMENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `assessments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `assessment_type` ENUM('exam', 'quiz', 'homework', 'project') DEFAULT 'quiz',
  `subject_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `academic_period_id` INT NOT NULL,
  `max_marks` DECIMAL(5,2) DEFAULT 100.00,
  `weightage_percent` DECIMAL(5,2) DEFAULT 0.00,
  `created_by` INT NOT NULL, -- References teachers.id
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`academic_period_id`) REFERENCES `academic_periods` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 13. STUDENT_PROGRESS / RESULTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `student_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `assessment_id` INT DEFAULT NULL,
  `subject_id` INT NOT NULL,
  `marks` DECIMAL(5,2) NOT NULL,
  `grade` VARCHAR(10) DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `recorded_by` INT DEFAULT NULL, -- References teachers.id
  `date_recorded` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  INDEX `idx_progress_student` (`student_id`),
  INDEX `idx_progress_subject` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 14. CONVERSATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE `conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT DEFAULT NULL, -- Relates chat context to a student
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 15. CONVERSATION_PARTICIPANTS JUNCTION TABLE
-- ------------------------------------------------------------
CREATE TABLE `conversation_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_participant` (`conversation_id`, `user_id`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 16. MESSAGES TABLE
-- ------------------------------------------------------------
CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT NOT NULL,
  `sender_id` INT NOT NULL,
  `message_text` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_msg_convo` (`conversation_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 17. NOTIFICATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_id` INT NOT NULL,
  `type` ENUM('message', 'result', 'attendance', 'announcement') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `payload_json` TEXT DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_recipient` (`recipient_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 18. ANNOUNCEMENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `target_audience` ENUM('all', 'parents', 'teachers') DEFAULT 'all',
  `class_id` INT DEFAULT NULL,
  `created_by` INT NOT NULL, -- References users.id
  `is_published` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 19. AUDIT_LOGS TABLE (Security & Admin Tracking)
-- ------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_table` VARCHAR(100) DEFAULT NULL,
  `record_id` INT DEFAULT NULL,
  `details_json` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DEMO SEED DATA
-- Password for all accounts is 'password' (bcrypt hash)
-- ============================================================

-- Seed Users
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone_number`, `role`, `status`) VALUES
(1, 'admin@example.com', '$2y$10$u8L0pL7H9/jNspgB7k25E.h30C4tT/M2R5d8wJ1YhG4713UfE8Cae', 'System Administrator', '+1234567890', 'admin', 'active'),
(2, 'teacher@example.com', '$2y$10$u8L0pL7H9/jNspgB7k25E.h30C4tT/M2R5d8wJ1YhG4713UfE8Cae', 'Sarah Connor', '+1987654321', 'teacher', 'active'),
(3, 'parent@example.com', '$2y$10$u8L0pL7H9/jNspgB7k25E.h30C4tT/M2R5d8wJ1YhG4713UfE8Cae', 'John Doe Sr.', '+1122334455', 'parent', 'active');

-- Seed Teachers
INSERT INTO `teachers` (`id`, `user_id`, `employee_number`, `qualification`, `specialization`, `hire_date`) VALUES
(1, 2, 'EMP10024', 'Bachelor of Education', 'Mathematics & Science', '2022-01-15');

-- Seed Parents
INSERT INTO `parents` (`id`, `user_id`, `occupation`, `address`, `emergency_contact`) VALUES
(1, 3, 'Software Engineer', '123 Elm Street, Springfield', '+1122334499');

-- Seed Academic Periods
INSERT INTO `academic_periods` (`id`, `academic_year`, `term_name`, `start_date`, `end_date`, `is_active`) VALUES
(1, '2026', 'Term 1', '2026-01-10', '2026-04-15', 1);

-- Seed Classes (Ugandan Secondary School Streams: S.1 to S.6)
INSERT INTO `classes` (`id`, `class_name`, `grade_level`) VALUES
(1, 'Senior 1 East', 1),
(2, 'Senior 3 Science', 3),
(3, 'Senior 5 PCM', 5);

-- Seed Subjects
INSERT INTO `subjects` (`id`, `subject_code`, `subject_name`) VALUES
(1, 'MATH101', 'Mathematics'),
(2, 'SCI101', 'General Science'),
(3, 'ENG101', 'English Language');

-- Seed Students
INSERT INTO `students` (`id`, `admission_number`, `full_name`, `date_of_birth`, `gender`, `class_id`, `status`) VALUES
(1, 'STU-2026-01', 'Jimmy Doe', '2016-04-12', 'male', 1, 'active'),
(2, 'STU-2026-02', 'Alice Doe', '2018-09-25', 'female', 2, 'active');

-- Seed Parent-Student Links
INSERT INTO `parent_students` (`parent_id`, `student_id`, `relationship_type`) VALUES
(1, 1, 'father'),
(1, 2, 'father');

-- Seed Teacher Assignments (Assigned across S.1 East, S.3 Science, S.5 PCM)
INSERT INTO `teacher_classes` (`teacher_id`, `class_id`, `academic_period_id`, `is_homeroom_teacher`) VALUES
(1, 1, 1, 1),
(1, 2, 1, 0),
(1, 3, 1, 0);

INSERT INTO `teacher_subjects` (`teacher_id`, `subject_id`, `class_id`) VALUES
(1, 1, 1),
(1, 2, 1);

-- Seed Attendance
INSERT INTO `attendance` (`student_id`, `class_id`, `attendance_date`, `status`, `remarks`, `recorded_by`) VALUES
(1, 1, '2026-08-28', 'present', 'On time and active', 1),
(2, 2, '2026-08-28', 'late', 'Arrived 15 minutes late', 1),
(1, 1, '2026-08-27', 'present', 'Participated in group discussion', 1);

-- Seed Assessments
INSERT INTO `assessments` (`id`, `title`, `assessment_type`, `subject_id`, `class_id`, `academic_period_id`, `max_marks`, `created_by`) VALUES
(1, 'Algebra Quiz 1', 'quiz', 1, 1, 1, 100.00, 1),
(2, 'Science Mid-Term Exam', 'exam', 2, 1, 1, 100.00, 1);

-- Seed Results
INSERT INTO `student_progress` (`student_id`, `assessment_id`, `subject_id`, `marks`, `grade`, `comments`, `recorded_by`, `date_recorded`) VALUES
(1, 1, 1, 92.50, 'A', 'Excellent performance in algebra test.', 1, '2026-08-26'),
(1, 2, 2, 85.00, 'B+', 'Good work. Demonstrates solid grasp of concepts.', 1, '2026-08-26'),
(2, 1, 1, 78.00, 'B', 'Shows understanding but needs more practice.', 1, '2026-08-26');

-- Seed Conversations
INSERT INTO `conversations` (`id`, `student_id`) VALUES
(1, 1);

INSERT INTO `conversation_participants` (`conversation_id`, `user_id`) VALUES
(1, 2), -- Teacher (Sarah Connor)
(1, 3); -- Parent (John Doe Sr.)

-- Seed Messages
INSERT INTO `messages` (`conversation_id`, `sender_id`, `message_text`, `is_read`, `created_at`) VALUES
(1, 2, 'Hello! I wanted to check in on Jimmy. He is doing great in Mathematics, but missed homework yesterday.', 1, '2026-08-28 14:30:00'),
(1, 3, 'Thanks for letting me know, Ms. Connor! I will make sure he completes it tonight.', 1, '2026-08-28 15:02:00');

-- Seed Announcements
INSERT INTO `announcements` (`title`, `content`, `target_audience`, `created_by`) VALUES
('Welcome to the New School Term!', 'We are excited to welcome all students and parents back to school. Let us have a great year together.', 'all', 1),
('Teacher Conference Day', 'Please remember that there will be no classes this Friday due to the teacher grading conference.', 'teachers', 1),
('PTA General Meeting', 'The parent-teacher association will hold a assembly in the school hall this Wednesday at 6 PM.', 'parents', 1);
