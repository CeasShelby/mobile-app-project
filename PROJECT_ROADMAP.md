# Parent–Teacher Communication App — Master Project Roadmap & Architectural Specification

## Project Overview
A production-quality mobile application built with **Expo (React Native)**, a **PHP (PDO) RESTful API**, and a **MySQL 8** relational database. The app facilitates secure, organized, near-real-time communication between parents and teachers, enabling parents to monitor academic progress, attendance, assessments, teacher feedback, and school announcements.

---

## System Architecture

```
+-------------------------------------------------------------+
|                 Mobile Client (Expo / React Native)         |
|   - Expo Router (File-Based Routing: (parent), (teacher), (admin))
|   - Context API & AsyncStorage/SecureStore for Session State|
|   - Modern Component & Service Abstraction Layer             |
+-------------------------------------------------------------+
                              |
                     HTTPS / JSON REST API
                              v
+-------------------------------------------------------------+
|                  PHP Backend (PDO REST API)                 |
|   - Config & Database Pool (`config/database.php`)           |
|   - Authentication Middleware & JWT Token Inspector         |
|   - Role-Based Server-Side Authorization Guards             |
|   - Prepared Statements & Input Validation                  |
+-------------------------------------------------------------+
                              |
                         PDO MySQL
                              v
+-------------------------------------------------------------+
|                  MySQL 8 Relational Database                |
|   - Normalized Tables (Users, Parents, Teachers, Students)  |
|   - Junction Tables for Many-to-Many Relationships          |
|   - Foreign Keys, Indexes, & Referential Integrity          |
+-------------------------------------------------------------+
```

---

## 28-Phase Implementation Strategy (Communication-First Framework)

- [x] **Phase 1: Database Architecture** — Design normalized schema, entities, relationships, and messaging channels.
- [x] **Phase 2: Database Implementation & Seed Data** — Complete SQL creation script with constraints, indexes, and seeded demo accounts.
- [x] **Phase 3: PHP Backend Foundation** — Modular backend architecture (`config/database.php`, `helpers/response.php`, `middleware/auth.php`, `api/health.php`).
- [x] **Phase 4: Authentication API & Security** — Login (`api/auth/login.php`), profile (`api/auth/me.php`), password update (`api/auth/change_password.php`), and JWT token validation.
- [x] **Phase 5: Expo Application Foundation** — Mobile app services layer (`src/services/api.js`, `src/services/auth.js`), types, theme tokens, and component library.
- [x] **Phase 6: Expo Authentication Flow** — Login screen, password validation, error banners, and demo credentials helper.
- [x] **Phase 7: Authentication Integration** — Connected mobile auth forms to live PHP API endpoints, `AsyncStorage` token caching, and role-based route guards.
- [x] **Phase 8: Parent Dashboard** — Greeting, child selector, academic summary cards, recent notices, and instant teacher contact launcher.
- [x] **Phase 9: Student Profile & History** — Comprehensive child profile view, class details, attendance summary, and teacher contact links.
- [x] **Phase 10: Multi-Class Teacher Session Switcher** — Add sticky secondary class selector (`[ Active Class Selector ]`) to top of Teacher screens, dynamically managing assigned S.1-S.6 streams via `TeacherClassContext` and `teacher_classes`.
- [x] **Phase 11: Teacher Class-Scoped Roster & Attendance** — Stream-scoped student roll-call, batch attendance submission (`record_batch_attendance.php`), live stream statistics, and automated parent alert triggers for absent/late students.
- [x] **Phase 12: Teacher Class-Scoped Gradebook & Progress** — Stream-scoped subject marks registration, live Ugandan UNEB grade preview (O-Level D1–F9 / A-Level A–F), recent stream post logs (`get_class_progress.php`), and automated parent grade alerts.
- [x] **Phase 13: Parent-Teacher Direct Messaging Engine** — 1-on-1 direct chat threads, unread counters, read receipts, and secondary stream contact directory (`get_contacts.php`, `get_messages.php`, `send_message.php`).
- [x] **Phase 14: Admin Master Registration Suite** — Secondary stream registration (S.1–S.6), student enrollment, multi-class teacher matrix assignments (`teacher_classes`), and system overview metrics (`manage_classes.php`, `manage_teachers.php`, `manage_students.php`, `get_overview.php`).
- [x] **Phase 15: Staff & Multi-Role Communication Network** — Category-filtered directory picker (`All`, `Teachers`, `Parents`, `Staff`) connecting Parents, Teachers, Admins, and Administrative Staff (Headteachers, Counselors, Bursars) via `manage_staff.php` and `get_contacts.php`.
- [x] **Phase 16: Near-Real-Time Communication Sync** — Active polling abstraction layer (4s sync interval), instant unread count badges, and system notifications endpoint (`get_unread_counts.php`, `get_notifications.php`, `SyncContext.jsx`).
- [x] **Phase 17: Class & School Announcements Board** — Broadcast notice board allowing Admins to post school-wide notices and Teachers to post stream-scoped parent announcements (`create_announcement.php`, `get_announcements.php`, `TeacherClassContext`).
- [x] **Phase 18: Event-Driven In-App Notifications Center** — Centralized alert inbox (`NotificationCenterModal.jsx`) aggregating live attendance, assessment results, announcements, and direct chat message alerts (`mark_all_read.php`, `get_notifications.php`).
- [x] **Phase 19: Profile Management & Contact Info Updates** — Self-service profile management (`ProfileEditModal.jsx`), contact details editing, and Bcrypt password verification & update (`update_profile.php`, `change_password.php`).
- [x] **Phase 20: Search & Contextual Filtering** — Real-time instant search bars across student roll-call rosters, assessment marks lists, messaging contact directories, and notice boards (`attendance.jsx`, `progress.jsx`, `messaging.jsx`, `notifications.jsx`).
- [ ] **Phase 21: Error Handling & Network Resilience** — Server offline fallbacks, retry buttons, friendly network error banners.
- [ ] **Phase 22: Security Hardening & Data Scoping** — Strict server-side authorization guards ensuring parents ONLY access their linked children and teachers ONLY access assigned class rosters.
- [ ] **Phase 23: Reusable Frontend UI Library** — Standardized Card, Button, Avatar, Skeleton, and Badge components.
- [ ] **Phase 24: State Management & Token Persistence** — Local context optimization, `ClassContext` provider, token persistence.
- [ ] **Phase 25: Accessibility & UX Validation** — High-contrast themes, clear touch targets, and screen reader labels.
- [ ] **Phase 26: Performance Optimization** — FlatList pagination, image caching, and SQL query indexing.
- [ ] **Phase 27: Admin Audit Logging** — Administrative tracking of class assignments, user creation, and grade modifications.
- [ ] **Phase 28: Final Quality Assurance & Production Release** — End-to-end verification across iOS, Android, and Web with seeded demo data.

---

## Core System User Roles & Security Matrix

| Role | Permissions | Access Scope |
| :--- | :--- | :--- |
| **Parent** | View linked children, view progress/attendance, message child's teachers, view announcements. | Strictly restricted to their own linked children. |
| **Teacher** | Mark attendance, log marks/grades, add comments, message parents of assigned students, view notices. | Strictly restricted to assigned classes/subjects. |
| **Admin** | Full CRUD on users, teachers, parents, students, classes, subjects; assign relationships; post bulletins. | System-wide administrative access with audit tracking. |

---

## Seed Accounts (Demo Credentials)

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | `password` | System Superuser |
| **Teacher** | `teacher@example.com` | `password` | Sarah Connor (Emp: EMP10024) |
| **Parent** | `parent@example.com` | `password` | John Doe Sr. (Parent of Jimmy & Alice) |

---

## Definition of Done (Phase Completion Requirements)
Every phase is complete ONLY when:
1. Code exists in the repository without placeholder hacks.
2. Database schema is updated and constraint-checked.
3. PHP API endpoints return standardized `{ "success": true/false, "message": "...", "data": {} }` responses.
4. Mobile frontend screens render real API responses with proper loading, empty, and error states.
5. Server-side authorization blocks unauthorized requests.
6. Execution and testing steps are documented and verified.
