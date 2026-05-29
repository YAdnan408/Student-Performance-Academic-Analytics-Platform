# Project Architecture & Module Plan

This document outlines the architectural patterns and directory structure for the Student Performance & Academic Analytics Platform.

## 1. Global Error Handling
To ensure a clean and maintainable codebase, error handling is centralized at the application level.
- **Location:** backend/app/core/exceptions.py and backend/app/core/error_handlers.py.
- **Policy:** Router files MUST NOT contain try-catch blocks for general error handling. Instead, they should raise custom exceptions defined in exceptions.py which are then caught by the global handler in main.py.

## 2. Module Architectures

### 3-Layer Architecture
Used for modules with stable logic or high data-centricity.
- **Applied to:** auth, academic, analytics, reporting.
- **Structure:**
  - router.py: API endpoints and request/response handling.
  - service.py: Business logic and orchestration.
  - repository.py: Data access logic (Database interaction).
  - schema.py: Pydantic models for request/response validation.
  - interfaces.py: Abstract base classes or protocols.
  - exceptions.py: Module-specific exceptions.

### Clean Architecture
Used for modules with high logic complexity or volatility.
- **Applied to:** intelligence.
- **Layers:**
  - domain/: Pure business entities and logic (no dependencies).
  - application/use_cases/: Business rules specific to the application.
  - infrastructure/: External concerns like Database, ML libraries, etc.
  - router/: Entry points for the module.
  - interfaces.py & exceptions.py: For boundary definitions and error types.

## 3. Module Index

| Module | Architecture | Responsibility |
| :--- | :--- | :--- |
| **Auth** | 3-Layer | RBAC, JWT, Authentication. |
| **Academic** | 3-Layer | Core student records, enrollment, attendance, grades. |
| **Analytics** | 3-Layer | GPA calculations, performance trends, dashboards. |
| **Reporting** | 3-Layer | PDF generation and data exports. |
| **Intelligence**| Clean Arch | ML-based predictions and recommendation engine. |

---
*Note: This plan reflects the updated directory structure in backend/app/modules/.*
