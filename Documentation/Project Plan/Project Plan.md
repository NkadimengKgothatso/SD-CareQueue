# SD CareQueue — Project Plan

Community Clinic Appointment, Queue Management, and Machine Learning Wait Time Prediction System

---

# 1. Project Overview

SD CareQueue is a healthcare queue and appointment management system designed to improve patient experience in South African clinics. The system reduces waiting uncertainty through:

- Online appointment booking
- Virtual queue management
- Real-time patient tracking
- Machine learning-based wait time prediction
- Clinic analytics and reporting tools

The project follows Agile Scrum methodology with iterative sprint delivery and continuous integration.

---

# 2. Project Timeline (Milestones)

| Sprint | Duration | Dates | Focus |
|---|---|---|---|
| Sprint 1 | 15 days | 29 Mar – 13 Apr | Core system setup (Auth, Booking, Queue, Dashboard) |
| Sprint 2 | 7 days | 13 Apr – 20 Apr | Clinic management, staff access, queue improvements |
| Sprint 3 | 21 days | 20 Apr – 11 May | Notifications, analytics, ML integration |
| Sprint 4 | 7 days | 11 May – 18 May | Admin dashboard, reports, PWA, final polish |

---

# 3. Project Milestones

## Milestone 1 — Core System Delivered (End of Sprint 1)
- Google Authentication implemented
- Role-based dashboards (Patient, Staff, Admin)
- Clinic search functionality
- Appointment booking system
- Basic queue management system

---

## Milestone 2 — Operational System (End of Sprint 2)
- Walk-in patient registration
- Improved queue management
- Clinic management (admin)
- Staff access control system
- Patient dashboard navigation improvements

---

## Milestone 3 — Intelligent System (End of Sprint 3)
- Notification system (2nd in queue alerts)
- Staff availability scheduling
- Appointment status updates
- Machine learning wait time prediction
- Analytics dashboard (wait times & no-shows)

---

## Milestone 4 — Final Production System (End of Sprint 4)
- Admin operational dashboard
- Clinic operating hours management
- CSV & PDF report export
- Capacity-based booking enforcement
- Progressive Web App (PWA) support

---

# 4. Sprint Deliverables

---

## Sprint 1 Deliverables

**Core Application Foundation**
- Google OAuth authentication
- Role selection system
- Patient dashboard
- Clinic search system
- Appointment booking system
- Queue management system

**Outcome:** Functional MVP system for patients and staff.

---

## Sprint 2 Deliverables

**Operational Improvements**
- Walk-in registration system
- Enhanced queue management
- Clinic management module
- Staff invitation and access control
- Improved dashboard navigation

**Outcome:** Fully functional clinic workflow system.

---

## Sprint 3 Deliverables

**Intelligent System Features**
- Queue notifications (2nd position alerts)
- Staff weekly availability scheduling
- Appointment status tracking system
- Machine learning wait time prediction API
- Analytics dashboard (wait time + no-show analysis)

**Outcome:** Smart healthcare system with predictive capabilities.

---

## Sprint 4 Deliverables

**Final System & Deployment**
- Admin operational dashboard
- Clinic operating hours management
- CSV and PDF report exporting
- Capacity-based appointment booking
- Progressive Web App (PWA) deployment

**Outcome:** Production-ready healthcare management system.

---

# 5. Project Architecture

## Frontend
- HTML
- CSS
- JavaScript
- Progressive Web App (PWA)

## Backend
- Firebase Authentication
- Firestore Database

## Machine Learning
- Python
- Flask API
- Scikit-learn (Random Forest Regression)

## DevOps / Deployment
- GitHub Actions (CI)
- Vercel (Frontend hosting)
- Render (ML API hosting)

---

# 6. Agile Methodology

The project follows Scrum:

- Product Backlog maintained across all features
- Sprint planning before each iteration
- Daily development updates
- Sprint reviews after each sprint
- Continuous integration via GitHub

---

# 7. Risk Management

| Risk | Mitigation |
|---|---|
| ML model accuracy issues | Use historical Firestore data + retraining |
| Queue synchronization delays | Real-time Firestore listeners |
| Overbooking appointments | Slot validation + staff availability constraints |
| API downtime | Render deployment monitoring |

---

# 8. Success Criteria

The project is considered successful when:

- Patients can book and track appointments in real time
- Clinics can manage queues efficiently
- Staff can update patient statuses
- ML model provides accurate wait time predictions
- Admin can monitor and export clinic performance data
- System is deployable as a PWA

---

# 9. Final Outcome

SD CareQueue delivers a scalable, intelligent clinic management system that improves:

- Patient waiting experience
- Clinic operational efficiency
- Resource allocation
- Healthcare accessibility in South Africa

---