# SD CareQueue

Community Clinic Appointment, Queue Management, and Machine Learning Wait Time Prediction System

[![codecov](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue/branch/main/graph/badge.svg)](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue)

---

# Live Application

Production System:

https://care-queue-delta.vercel.app

Machine Learning API:

https://sd-carequeue.onrender.com/predict

---

# Introduction

Public healthcare clinics across South Africa often experience overcrowding, long queues, appointment uncertainty, and limited visibility into patient waiting times. Patients may wait several hours without knowing their queue position or estimated consultation time, negatively affecting healthcare accessibility and patient experience.

SD CareQueue is a modern web-based healthcare queue and appointment management platform designed to improve clinic workflow efficiency and patient experience through real-time scheduling, queue management, analytics, and machine learning-based wait time prediction.

The platform enables patients to:

- Book appointments online
- Join virtual queues remotely
- Track live queue progress
- Receive estimated waiting times
- Receive queue notifications and reminders
- Access clinic operating hours and healthcare facility information

The system also enables clinic staff and administrators to:

- Manage patient queues in real time
- Monitor clinic workflow
- Configure clinic schedules and operating hours
- Manage healthcare staff availability
- Access analytics and reporting dashboards
- Export operational reports
- Use machine learning predictions to improve queue transparency

---

# Project Objectives

This project applies modern software engineering and machine learning principles using Agile methodology, CI/CD workflows, and Test-Driven Development (TDD).

The system aims to:

- Reduce patient waiting time uncertainty
- Improve healthcare workflow efficiency
- Prevent appointment overbooking
- Improve healthcare accessibility
- Support real-time queue transparency
- Provide predictive wait time estimates
- Improve clinic scheduling accuracy
- Support scalable multi-clinic operations
- Deliver responsive cross-platform access through PWA support

---

# Core Features

## 1. Appointment Booking

Patients can:

- View available appointment slots
- Book appointments online
- Reschedule appointments
- Cancel appointments
- Join virtual queues as walk-in patients

### Smart Capacity Management

Appointment scheduling dynamically aligns with staff availability and clinic operating capacity.

Features include:

- Staff-based slot allocation
- Dynamic appointment slot updates
- Fully booked slot disabling
- Daily clinic capacity validation
- Prevention of overbooking
- Availability-aware scheduling

---

## 2. Queue Management

Clinic staff can:

- Manage patient queues in real time
- Update patient statuses:
  - Waiting
  - In Consultation
  - Complete
- Reorder queues
- Add walk-in patients
- Reschedule patients
- Monitor queue progression

---

## 3. Real-Time Patient Tracking

Patients can:

- View live queue position
- View estimated waiting times
- Receive appointment reminders
- Receive intelligent queue notifications
- Track live queue updates remotely

The system automatically recalculates queue conditions whenever:

- Patients are served
- Queue positions change
- Walk-ins are added
- Appointments are cancelled

---

# Machine Learning Wait Time Prediction

SD CareQueue integrates a real-time machine learning prediction system that dynamically estimates patient waiting times using historical queue activity and live queue conditions.

The prediction system uses a Random Forest Regression model trained on historical queue data stored in Firebase Firestore.

Predictions are recalculated automatically whenever queue activity changes.

---

## ML Prediction Features

- Real-time wait time prediction
- Random Forest regression model
- Automatic queue recalculation
- Firebase Firestore synchronization
- Live dashboard prediction updates
- Queue activity monitoring
- Flask prediction API
- Multi-clinic prediction support
- Cloud deployment ready architecture


---

# Clinic Directory (SA Healthcare Data Integration)

The clinic directory integrates South African healthcare facility datasets.

Features include filtering by:

- Province
- District
- Facility type
- Services offered
- Region

The platform uses real clinic names and healthcare facility information.

---

# Clinic & Staff Management

Administrators can:

- Manage clinics and services
- Assign staff to facilities
- Configure clinic operating hours
- Monitor clinic scheduling

Staff members can:

- Configure weekly availability schedules
- Manage appointment allocations

---

## Clinic Hours Management

Version 4 introduces a complete clinic hours management system.

Administrators can:

- Configure operating days
- Configure opening and closing times
- Update clinic schedules
- Validate invalid operating hours

Features include:

- Clinic hours popup management
- Day configuration
- Time configuration
- Validation preventing invalid submissions
- Persistent operating hours storage
- Patient-facing operating hours display

---

# Notifications & Reminders

The platform supports:

- Queue notifications
- Appointment reminders
- Live patient alerts
- Intelligent queue reminders
- Real-time queue updates

---

# Analytics & Reporting

Administrators can monitor clinic performance using analytics dashboards.

## Dashboard Analytics

- Average patient wait times
- Average wait times by clinic
- Average wait times by time of day
- Appointment no-show rates
- Queue performance analytics
- Operational insights

---

## Report Exporting

Reports can be exported as:

- CSV
- PDF

Features include:

- CSV export support
- PDF export support
- Downloadable analytics reports
- Exportable clinic operational data

---

# Progressive Web Application (PWA)

CareQueue is a fully installable Progressive Web Application.

## PWA Features

- Mobile-responsive layouts
- Desktop installation support
- Mobile installation support
- Standalone/fullscreen mode
- Cross-platform accessibility
- Improved mobile performance

Users can install the application directly on desktop or mobile devices for an app-like experience.

---

# User Roles

## Patient

- Book appointments
- Join queues
- Track queue status
- View estimated wait times
- View clinic information
- View clinic operating hours

## Clinic Staff

- Manage patient queues
- Update patient statuses
- Monitor queue progression
- Manage scheduling
- Track queue activity

## Admin

- Manage clinics and staff
- Configure operating hours
- Access analytics dashboards
- Export reports
- Manage healthcare facilities
- Monitor system operations

---

# Firebase Collections

```text
Users
Appointments
Queues
QueueHistory
Notifications
StaffAvailability
clinicsObjects
admins
ApprovedStaff
```

---

# Technology Stack

## Frontend

- HTML
- CSS
- JavaScript

## Backend & Database

- Firebase Authentication
- Firestore Database

## Machine Learning & API

- Python
- Flask
- Scikit-learn
- Random Forest Regression

## Testing

- Jest

## Deployment & DevOps

- GitHub Actions
- Vercel
- Render

---

# Software Engineering Practices

This project follows modern software engineering practices including:

- Agile Scrum methodology
- Test-Driven Development (TDD)
- Continuous Integration and Continuous Deployment (CI/CD)
- User Acceptance Testing (UAT)
- Responsive UI design
- Real-time cloud synchronization

---

# User Acceptance Testing Highlights

## Clinic Hours Management

- Admin can configure clinic hours
- Invalid operating hours are rejected
- Previously saved hours display correctly
- Patients can view operating hours

---

## Report Exporting

- Reports export successfully as CSV
- Reports export successfully as PDF
- Exported reports contain clinic operational data

---

## Appointment Capacity Management

- Booking slots align with staff availability
- Fully booked slots are disabled
- Users cannot book unavailable appointments
- Capacity updates dynamically

---

## Machine Learning Prediction

- Wait times recalculate automatically
- Predictions update in real time
- Queue activity triggers prediction refresh
- Dashboard displays estimated waiting times

---

## Progressive Web Application

- Application installs on mobile and desktop
- Standalone/fullscreen support works correctly
- Responsive layouts function across devices

---

# Security & Privacy

The machine learning system stores queue metadata only.

The system does NOT process:

- Medical records
- Diagnoses
- Patient notes
- Sensitive healthcare information

Recommended security practices:

- Enable Firebase Authentication
- Restrict Firestore access rules
- Use HTTPS for API communication
- Never commit serviceAccountKey.json

---

# Scalability

The system architecture supports:

- Real-time synchronization
- Multiple clinics
- Concurrent queue monitoring
- Cloud deployment
- Future ML retraining
- Additional predictive features
- Advanced analytics expansion
- Production-scale ML deployment

---

# Deployment

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Flask ML API hosting |
| Firebase | Authentication & Firestore |
| Flask | ML prediction API |
| Scikit-learn | Machine learning model training |

---

# Future Improvements

Planned enhancements include:

- Improved ML prediction accuracy
- Doctor workload prediction
- Queue congestion forecasting
- Patient priority weighting
- Automated model retraining
- Advanced analytics dashboards
- WebSocket-based live updates
- Multi-model ML experimentation
- Native mobile application support
- Expanded healthcare integrations

---

# Contributors

- Junior Sebetola
- Karabo Machimana
- Kgotatso Nkadimeng
- Oratile Modiakgotla
- Wilson Legadima
- Realeboha Monaiwa

---

# License

This project was developed for educational and healthcare improvement purposes.

