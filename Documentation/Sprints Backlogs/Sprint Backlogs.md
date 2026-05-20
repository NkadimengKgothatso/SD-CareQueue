# SD CareQueue — Sprint Backlogs

Community Clinic Appointment, Queue Management, and Machine Learning Wait Time Prediction System

---

# Sprint 1 Backlog

## Sprint Goal

Implement core patient functionality including authentication, patient dashboard, clinic searching, appointment booking, appointment management, and queue management.

---

## Sprint 1 User Stories

| User Story ID | Feature | Assigned Member | Story Points |
|---|---|---|---|
| US-01 | Google Authentication & Role Selection | Kea | 10 |
| US-02 | Patient Dashboard | Kgothatso | 10 |
| US-03 | Find Clinic | Karabo | 10 |
| US-04 | My Appointments | Junior | 9 |
| US-05 | Queue Management & Queue Status | Rea | 10 |
| US-06 | Book Appointment | Wilson | 10 |

### Total Sprint Story Points

**59 Story Points**

---

## US-01 — Google Authentication & Role Selection

### Assigned To
Kea

### User Story
As a patient, clinic staff member, or admin, I want to sign in with my Google account and select whether I am a Patient, Clinic Staff, or Admin, so that I land on the correct dashboard for my role.

### Tasks
- Setup Google OAuth authentication
- Implement role selection
- Redirect users based on role
- Test login flow

### UATs
- Patient login redirects correctly
- Staff login redirects correctly
- Admin login redirects correctly

---

## US-02 — Patient Dashboard

### Assigned To
Kgothatso

### Tasks
- Create dashboard UI
- Display appointment details
- Add navigation buttons
- Handle no appointment state

### UATs
- Dashboard displays upcoming appointments
- Empty states display correctly

---

## US-03 — Find Clinic

### Assigned To
Karabo

### Tasks
- Implement clinic search
- Integrate SA clinic dataset
- Add filtering
- Implement Near Me button

### UATs
- Clinics filter correctly
- Search works with partial input

---

## US-04 — My Appointments

### Assigned To
Junior

### Tasks
- Create appointments page
- Display upcoming/past appointments
- Add cancel/reschedule functionality

### UATs
- Patients can cancel appointments
- Patients can reschedule appointments

---

## US-05 — Queue Management & Queue Status

### Assigned To
Rea

### Tasks
- Create queue UI
- Add status update functionality
- Add walk-in patients
- Sync with Firestore

### UATs
- Queue updates correctly
- Staff can update statuses

---

## US-06 — Book Appointment

### Assigned To
Wilson

### Tasks
- Create booking UI
- Add date picker
- Save appointments to Firestore
- Handle unavailable slots

### UATs
- Appointment booking works
- Fully booked slots disable correctly

---

# Sprint 2 Backlog

## Sprint Goal

Improve clinic management, queue handling, staff access control, appointment visibility, and dashboard navigation.

---

## Sprint 2 User Stories

| User Story | Assigned Member | Story Points |
|---|---|---|
| Walk-in Patient Registration | Junior | 9 |
| Queue Management Improvements | Rea | 10 |
| Clinic Management | Karabo | 8 |
| Patient Dashboard Navigation | Kgothatso | 8 |
| Staff Invitation & Access Control | Kea | 8 |
| Upcoming Appointments Dashboard | Wilson | 10 |

### Total Sprint Story Points

**53 Story Points**

---

## Walk-in Patient Registration

### Assigned To
Junior

### Tasks
- Register walk-in patients
- Add patients to queue system
- Store walk-ins in appointments

### UATs
- Walk-ins appear in queue
- Queue updates correctly

---

## Queue Management Improvements

### Assigned To
Rea

### Tasks
- Match UI to prototype
- Improve sidebar interactions
- Remove unused walk-in button

### UATs
- Queue updates in real time
- Navigation works correctly

---

## Clinic Management

### Assigned To
Karabo

### Tasks
- Build clinic management UI
- Update clinic details

### UATs
- Clinic details save correctly

---

## Patient Dashboard Navigation

### Assigned To
Kgothatso

### Tasks
- Improve dashboard navigation
- Replace dummy variables
- Remove unused analytics section

### UATs
- Dashboard buttons work correctly

---

## Staff Invitation & Access Control

### Assigned To
Kea

### Tasks
- Create Admins collection
- Create ApprovedStaff collection
- Build admin portal

### UATs
- Approved staff can login
- Unauthorized staff denied access

---

## Upcoming Appointments Dashboard

### Assigned To
Wilson

### Tasks
- Display upcoming appointments
- Display clinic statistics
- Build dashboard UI

### UATs
- Appointments display correctly

---

# Sprint 3 Backlog

## Sprint Goal

Implement notifications, analytics, filtering, appointment status management, staff availability scheduling, and machine learning wait time estimation.

---

## Sprint 3 User Stories

| User Story | Assigned Member | Story Points |
|---|---|---|
| Clinic Filtering | Karabo | 9 |
| Queue Notifications | Wilson | 9 |
| Staff Availability Scheduling | Kea | 7 |
| Appointment Status Updates | Rea | 8 |
| Estimated Wait Times | Kgothatso | 9 |
| Analytics Dashboard | Junior | 7 |

### Total Sprint Story Points

**49 Story Points**

---

## Clinic Filtering

### Assigned To
Karabo

### Tasks
- Add service filtering
- Improve clinic filtering system

### UATs
- Clinics filter correctly

---

## Queue Notifications

### Assigned To
Wilson

### Tasks
- Integrate notification system
- Trigger notifications automatically
- Add email notifications

### UATs
- Notifications send correctly

---

## Staff Availability Scheduling

### Assigned To
Kea

### Tasks
- Build weekly availability system
- Disable unavailable days

### UATs
- Availability saves correctly

---

## Appointment Status Updates

### Assigned To
Rea

### Tasks
- Update appointment statuses
- Sync queue updates

### UATs
- Queue status updates correctly

---

## Estimated Wait Times

### Assigned To
Kgothatso

### Tasks
- Display estimated wait times
- Add real-time updates
- Show average wait times

### UATs
- Wait times update dynamically

---

## Analytics Dashboard

### Assigned To
Junior

### Tasks
- Calculate wait times
- Calculate no-show rates
- Add filtering support

### UATs
- Analytics display correctly

---

# Sprint 4 Backlog

## Sprint Goal

Implement admin operational dashboards, report exporting, clinic operating hours, appointment capacity alignment, and progressive web application enhancements.

---

## Sprint 4 User Stories

| User Story | Assigned Member | Story Points |
|---|---|---|
| Admin Operational Dashboard | Kea | 7 |
| Clinic Operating Hours | Karabo | 8 |
| Report Exporting | Junior | 7 |
| Capacity-Based Booking & PWA | Wilson | 7 |

### Total Sprint Story Points

**29 Story Points**

---

## Admin Operational Dashboard

### Assigned To
Kea

### Tasks
- Build admin dashboard
- Display clinic statistics
- Display queue statistics

### UATs
- Dashboard loads correctly
- Statistics calculate correctly

---

## Clinic Operating Hours

### Assigned To
Karabo

### Tasks
- Build clinic hours UI
- Save operating schedules

### UATs
- Operating hours update correctly

---

## Report Exporting

### Assigned To
Junior

### Tasks
- Export CSV reports
- Export PDF reports
- Add export buttons

### UATs
- Reports export successfully

---

## Capacity-Based Booking & PWA

### Assigned To
Wilson

### Tasks
- Align booking capacity with staff
- Implement PWA functionality

### UATs
- Booking slots update dynamically
- PWA installs successfully

---
