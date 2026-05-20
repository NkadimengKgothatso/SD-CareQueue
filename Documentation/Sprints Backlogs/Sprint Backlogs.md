# SD CareQueue — Sprint Backlogs

Community Clinic Appointment, Queue Management, and Machine Learning Wait Time Prediction System

---

# Sprint 1 Backlog

## Sprint Goal

Implement core system foundations including authentication, patient dashboard, clinic discovery, appointment booking, and queue management.

---

## Sprint 1 User Stories

| User Story | Assigned Member | Tasks | Story Points |
|---|---|---|---|
| As a user, I can sign in using Google authentication and select my role (Patient, Staff, or Admin) so that I can access the appropriate dashboard. | Kea | Google OAuth setup, role selection, dashboard routing, login testing | 10 |
| As a patient, I can access a dashboard showing my next appointment and queue status so that I can stay updated. | Kgothatso | Dashboard UI, appointment display, queue status binding, empty state handling | 10 |
| As a patient, I can search for clinics by location or name so that I can find nearby clinics. | Karabo | Clinic search UI, SA clinic dataset integration, filtering, validation handling | 10 |
| As a patient, I want to see all my upcoming and past appointments so that I can reschedule or cancel them if needed. | Junior | Appointments page UI, database sync, cancel/reschedule, empty state handling | 9 |
| As a clinic staff member, I want to manage the patient queue and update patient statuses so that I can control patient flow during the day. | Rea | Queue UI, status updates, walk-in handling, Firestore sync | 10 |
| As a patient, I can book appointments at clinics so that I can reduce waiting times. | Wilson | Booking UI, date picker, slot validation, Firestore save logic | 10 |

### Total Sprint Story Points

**59 Story Points**

---

# Sprint 2 Backlog

## Sprint Goal

Improve clinic management, queue handling, staff access control, dashboard navigation, and appointment visibility.

---

## Sprint 2 User Stories

| User Story | Assigned Member | Tasks | Story Points |
|---|---|---|---|
| As a clinic staff member, I want to register walk-in patients and add them to the appointments system so that they can be tracked and managed in the queue. | Junior | Walk-in registration, queue insertion, appointment record creation | 9 |
| As a staff member, I want to manage the queue so that I can track patient progress and update their status in real time. | Rea | UI alignment, sidebar actions, queue interaction fixes | 10 |
| As an admin, I can manage clinic details (services, clinic name, clinic location) so that information is accurate and up to date. | Karabo | Clinic management UI, update forms, data persistence | 8 |
| As a patient, I want to navigate easily using dashboard buttons so that I can quickly access different features. | Kgothatso | Dashboard UI improvements, real data binding, remove unused components | 8 |
| As an admin, I am able to invite staff members so that they can login. | Kea | Firestore admin/staff collections, access control, admin portal UI | 8 |
| As a clinic staff member, I want to see upcoming appointments so that I can prepare in advance and manage my schedule. | Wilson | Dashboard UI, appointment listing, daily stats display | 10 |

### Total Sprint Story Points

**53 Story Points**

---

# Sprint 3 Backlog

## Sprint Goal

Implement notifications, analytics, filtering, staff scheduling, appointment updates, and ML-based wait time estimation.

---

## Sprint 3 User Stories

| User Story | Assigned Member | Tasks | Story Points |
|---|---|---|---|
| As a user, I want to filter clinics by province or services so that I can easily find relevant clinics. | Karabo | Filtering logic update, service/province filters, UI updates | 9 |
| As a system, I want to send notifications when a patient is 2nd in the queue so that they can prepare and not miss their turn. | Wilson | Notification system, email integration, real-time triggers | 9 |
| As a clinic staff member, I want to set my weekly availability so that patients can only book appointments during working hours. | Kea | Availability UI, day toggles, validation logic | 7 |
| As clinic staff, I want to update appointment statuses (Waiting, In Consultation, Complete) so that the system reflects patient progress. | Rea | Status update system, queue sync, rescheduling logic | 8 |
| As a patient, I want to see estimated wait times and queue positions so that I can plan my time better. | Kgothatso | ML integration, wait time calculation, real-time updates | 9 |
| As an admin, I want to view analytics like wait times and no-shows so that I can improve clinic performance and efficiency. | Junior | Analytics calculations, filtering, dashboard charts | 7 |

### Total Sprint Story Points

**49 Story Points**

---

# Sprint 4 Backlog

## Sprint Goal

Implement admin dashboards, reporting, clinic operating hours, booking constraints, and PWA features.

---

## Sprint 4 User Stories

| User Story | Assigned Member | Tasks | Story Points |
|---|---|---|---|
| As an admin, I want to access a dashboard that shows key system information so that I can monitor clinic operations efficiently. | Kea | Admin dashboard UI, statistics calculation, clinic ranking | 7 |
| As an admin, I want to set or update clinic opening hours so that patients know when clinics are available. | Karabo | Hours UI, schedule update logic, validation | 8 |
| As an admin, I want to export clinic reports as CSV or PDF files so that I can analyse data and share insights easily. | Junior | CSV generation, PDF export, download system | 7 |
| As a patient, I want appointment booking slots to align with staff availability so that I can only book valid appointments. | Wilson | Capacity validation, booking constraints, PWA setup | 7 |

### Total Sprint Story Points

**29 Story Points**

---
