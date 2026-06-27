# Student Performance & Academic Analytics Platform — Database Design

Below is a clean, production-style PostgreSQL database design for your Student Performance & Academic Analytics Platform.

This schema is designed to support:
- Role-based authentication
- Student/instructor/admin dashboards
- Courses, enrollment, attendance, grades
- GPA + analytics
- Reports generation
- ML prediction engine (stored outputs)
- Recommendation engine (stored outputs)

It is normalized, scalable, and analytics-ready without overengineering.

---

## 1. users

**Purpose:** Central authentication table for all roles.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique user ID |
| email | VARCHAR(255) | Login email (unique) |
| password_hash | TEXT | Hashed password |
| role | ENUM | student / instructor / admin |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

---

## 2. students

**Purpose:** Stores student-specific information.

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Student ID |
| user_id | UUID (FK → users.id) | Linked account |
| student_id | VARCHAR(50) | University roll/ID |
| phone | VARCHAR(20) | Optional |
| profile_photo | TEXT | URL |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 3. instructors

**Purpose:** Instructor-specific profile.

| Column | Type |
|---|---|
| id | UUID (PK) |
| user_id | UUID (FK → users.id) |
| employee_id | VARCHAR(50) |
| designation | VARCHAR(100) |
| phone | VARCHAR(20) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

## 4. courses

**Purpose:** All courses offered.

| Column | Type |
|---|---|
| id | UUID (PK) |
| course_code | VARCHAR(20) |
| title | VARCHAR(255) |
| credit_hours | INT |
| description | TEXT |
| created_at | TIMESTAMP |

---

## 5. course_offerings

**Purpose:** A course taught by an instructor.

| Column | Type |
|---|---|
| id | UUID (PK) |
| course_id | UUID (FK) |
| instructor_id | UUID (FK) |
| section | VARCHAR(10) |
| created_at | TIMESTAMP |

---

## 6. enrollments

**Purpose:** Links students to course offerings.

| Column | Type |
|---|---|
| id | UUID (PK) |
| student_id | UUID (FK) |
| course_offering_id | UUID (FK) |
| enrolled_at | TIMESTAMP |
| status | ENUM (active, dropped, completed) |

---

## 7. attendance

**Purpose:** Daily attendance tracking.

| Column | Type |
|---|---|
| id | UUID (PK) |
| enrollment_id | UUID (FK) |
| date | DATE |
| status | ENUM (present, absent, late) |
| marked_by | UUID (FK → instructors.id) |
| created_at | TIMESTAMP |

---

## 8. assessments

**Purpose:** All grading components (quiz, exam, assignment).

| Column | Type |
|---|---|
| id | UUID (PK) |
| course_offering_id | UUID (FK) |
| title | VARCHAR(255) |
| type | ENUM (quiz, assignment, midterm, final) |
| total_marks | INT |
| weightage | FLOAT |
| due_date | DATE |
| created_at | TIMESTAMP |

---

## 9. grades

**Purpose:** Student marks for each assessment.

| Column | Type |
|---|---|
| id | UUID (PK) |
| assessment_id | UUID (FK) |
| student_id | UUID (FK) |
| marks_obtained | FLOAT |
| grade_letter | VARCHAR(5) |
| grade_points | FLOAT |
| created_at | TIMESTAMP |

---

## 10. gpa_records

**Purpose:** Precomputed GPA per student per course offering.

| Column | Type |
|---|---|
| id | UUID (PK) |
| student_id | UUID (FK) |
| course_offering_id | UUID (FK) |
| gpa | FLOAT |
| cgpa | FLOAT |
| total_credits | INT |
| calculated_at | TIMESTAMP |

---

## 11. ml_predictions

**Purpose:** Stores ML-based risk prediction results.

| Column | Type |
|---|---|
| id | UUID (PK) |
| student_id | UUID (FK) |
| course_offering_id | UUID (FK) |
| risk_score | FLOAT (0–1) |
| risk_level | ENUM (low, medium, high) |
| model_version | VARCHAR(50) |
| features_snapshot | JSONB |
| created_at | TIMESTAMP |

---

## 12. recommendations

**Purpose:** Stores recommendation engine output.

| Column | Type |
|---|---|
| id | UUID (PK) |
| student_id | UUID (FK) |
| type | VARCHAR(50) |
| message | TEXT |
| priority | ENUM (low, medium, high) |
| source | ENUM (rule_based, ml_based) |
| created_at | TIMESTAMP |

---

## 13. reports

**Purpose:** Generated academic reports (PDFs etc.).

| Column | Type |
|---|---|
| id | UUID (PK) |
| student_id | UUID (FK, nullable) |
| instructor_id | UUID (FK, nullable) |
| course_offering_id | UUID (FK) |
| report_type | ENUM (student, class) |
| file_url | TEXT |
| generated_at | TIMESTAMP |

---

## 14. audit_logs (optional but recommended)

**Purpose:** Track system changes.

| Column | Type |
|---|---|
| id | UUID (PK) |
| user_id | UUID (FK) |
| action | TEXT |
| entity_type | TEXT |
| entity_id | UUID |
| timestamp | TIMESTAMP |

---

## Key Design Decisions (Important)

### 1. Separation of concerns
- `users` = authentication
- `students` / `instructors` = profiles

This avoids role confusion.

### 2. Analytics optimization

Tables like:
- `gpa_records`
- `ml_predictions`

are precomputed tables → This avoids slow real-time aggregation queries.

### 3. JSONB usage (important)

Used in:
- `ml_predictions.features_snapshot`

Reason:
- ML inputs vary over time
- Flexible storage needed

### 4. Enrollment-centric design

Everything flows through:
```
students → enrollments → course_offerings
```

This makes attendance, grades, and GPA consistent.

### 5. Assessment-based grading system

Instead of storing "final grade only", we store:
- quizzes
- assignments
- exams

This enables real analytics like:
- difficulty analysis
- performance trends

### 6. Scalability readiness

This schema supports:
- Multiple courses and offerings
- Multiple instructors per course (can extend later)
- ML predictions per course offering
- Historical tracking
