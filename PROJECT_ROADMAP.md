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
- [ ] **Phase 10: Multi-Class Teacher Session Switcher** — Add sticky class selector (`[ Active Class Dropdown ]`) to top of Teacher Dashboard, dynamically loading assigned classes via `teacher_classes` junction table.
- [ ] **Phase 11: Teacher Class-Scoped Roster & Attendance** — Filter student roll-call, daily attendance marking (Present/Absent/Late), and automated parent alert triggers per active class session.
- [ ] **Phase 12: Teacher Class-Scoped Gradebook & Progress** — Input test marks, term grades, and feedback comments scoped to the selected active class session, automatically notifying linked parents.
- [ ] **Phase 13: Parent-Teacher Direct Messaging Engine** — 1-on-1 direct chat threads, unread counters, read receipts, and contact directory linking parents to their child's active class teacher.
- [ ] **Phase 14: Admin Master Registration Suite** — Admin portal to register Classes, enroll Students, assign Teachers to multi-class/subject matrices (`teacher_classes`), and create Administrative Staff profiles (`staff`).
- [ ] **Phase 15: Staff & Multi-Role Communication Network** — Directory picker connecting Parents, Teachers, Admins, and Administrative Staff (Principals, Counselors, Bursars).
- [ ] **Phase 16: Near-Real-Time Communication Sync** — Active polling abstraction layer (3s sync interval), instant unread count badges, and offline queues.
- [ ] **Phase 17: Class & School Announcements Board** — Broadcast notice board allowing Admins to post school-wide notices and Teachers to post class-specific parent announcements.
- [ ] **Phase 18: Event-Driven In-App Notifications Center** — Alert badges and push triggers when attendance is logged, grades are posted, or direct messages arrive.
- [ ] **Phase 19: Profile Management & Contact Info Updates** — Password change, avatar upload, and emergency contact edits for Parents, Teachers, and Staff.
- [ ] **Phase 20: Search & Contextual Filtering** — Instant search across parent conversations, student class rosters, and announcement archives.
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
