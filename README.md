[![codecov](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue/branch/main/graph/badge.svg)](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue)

# SD CareQueue

Community Clinic Appointment and Queue Management System

---

# Release v4.0.0

CareQueue v4.0.0 — Progressive Clinic Management & Smart Scheduling Update

Version 4 introduces major improvements focused on clinic operating hours management, intelligent appointment scheduling, report exporting, and Progressive Web Application support.

This release improves clinic administration, appointment reliability, reporting capabilities, mobile accessibility, and overall patient experience.

---

# Live Application

Access the deployed system here:

https://care-queue-delta.vercel.app

---

# Introduction

Public health clinics across South Africa are frequently overcrowded, with patients often waiting several hours without visibility into their queue position or estimated waiting time. This results in frustration, uncertainty, and missed healthcare opportunities.

SD CareQueue is a web-based appointment and queue management system designed to improve patient experience and clinic workflow by allowing patients to:

- Book appointments online
- Join virtual queues remotely
- Receive real-time queue updates
- Track estimated waiting times

The system also enables clinic staff and administrators to efficiently manage patient flow, clinic operations, reporting, and scheduling.

---

# Project Objectives

This project follows Agile methodology, incorporates CI/CD principles, and applies a Test-Driven Development (TDD) approach to build a scalable and reliable healthcare system.

The system aims to:

- Reduce patient waiting time and uncertainty
- Improve clinic workflow and queue efficiency
- Prevent appointment overbooking
- Improve accessibility through responsive mobile support
- Provide data-driven insights through analytics and reporting
- Support smarter scheduling through staff availability management

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

Appointment slots now dynamically align with available healthcare staff.

Features include:

- Staff-based appointment slot allocation
- Dynamic booking slot updates
- Fully booked slot disabling
- Daily clinic capacity validation
- Prevention of overbooking

---

## 2. Queue Management

Clinic staff can:

- Manage daily patient queues
- Update patient statuses:
  - Waiting
  - In Consultation
  - Complete
- Add or reschedule patients
- Track patient queue progress in real time

---

## 3. Real-Time Patient Tracking

Patients can:

- View queue position
- View estimated waiting times
- Receive queue notifications
- Receive appointment reminders
- Track live queue updates

---

## 4. Clinic Directory (SA Data Integration)

The clinic directory is integrated with South African healthcare facility datasets.

Features include filtering by:

- Province
- District
- Facility type
- Services offered
- Region

The system uses real clinic names, locations, and healthcare facility information.

---

## 5. Clinic & Staff Management

Administrators can:

- Manage clinics and services
- Assign staff to facilities
- Configure clinic operating hours

Staff members can:

- Set weekly availability schedules

### Clinic Hours Management

Version 4 introduces a complete clinic hours management system.

Administrators can:

- Configure operating days
- Configure opening and closing times
- Update existing clinic hours
- Validate incomplete or invalid operating hours

Features include:

- Hours management popup
- Start day and end day configuration
- Start time and end time configuration
- Validation preventing invalid submissions
- Persistent storage of clinic hours
- Display of operating hours to patients

---

## 6. Notifications & Reminders

The system supports:

- Queue notifications
- Appointment reminders
- Real-time patient alerts
- Intelligent queue notifications when patients are approaching their turn

---

## 7. Analytics & Reporting

Administrators can monitor clinic performance through analytics dashboards.

### Dashboard Reports

- Average patient wait times by clinic
- Average wait times by time of day
- Appointment no-show rates
- Custom analytics views

### Exporting Features

Reports can now be exported as:

- CSV
- PDF

Features include:

- CSV export button
- PDF export button
- Downloadable analytics reports
- Exportable clinic data

---

## 8. Progressive Web Application (PWA)

CareQueue is now a fully installable Progressive Web Application.

### Features

- Mobile-responsive layouts
- Desktop installation support
- Mobile installation support
- Standalone/fullscreen experience
- Cross-platform accessibility
- Improved performance across devices

Users can install the application directly on desktop or mobile devices for an app-like experience.

---

# User Roles

## Patient

- Book appointments
- Join queues
- Track queue status
- View clinic information
- View clinic operating hours

## Clinic Staff

- Manage patient queues
- Update appointment statuses
- Monitor patient flow
- Manage appointment scheduling

## Admin

- Manage clinics and staff
- Configure clinic operating hours
- Export reports
- Access analytics dashboards
- Manage healthcare facility information

---

# Tech Stack

## Frontend

- HTML
- CSS
- JavaScript

## Backend & Database

- Firebase Authentication
- Firestore Database

## Testing

- Jest

## Deployment & DevOps

- GitHub Actions
- Vercel

---

# Software Engineering Practices

This project follows modern software engineering principles including:

- Agile Scrum methodology
- Test-Driven Development (TDD)
- Continuous Integration and Continuous Deployment (CI/CD)
- User Acceptance Testing (UAT)

---

# User Acceptance Testing Highlights

## Clinic Hours Management

- Admin can open clinic hours popup
- Admin can configure operating hours
- Validation prevents incomplete submissions
- Invalid operating hours are rejected
- Previously saved hours are displayed
- Patients can view clinic operating hours

---

## Report Exporting

- Reports can be exported as CSV
- Reports can be exported as PDF
- Exported reports contain clinic data

---

## Appointment Capacity Management

- Booking slots depend on staff availability
- Fully booked slots are disabled
- Users cannot book unavailable slots
- Capacity updates dynamically

---

## Progressive Web Application

- Users can install the application on desktop or mobile
- App opens in standalone/fullscreen mode
- Responsive layouts supported across devices

---

# Contributors

- Junior Sebetola
- Karabo Machimana
- Kgotatso Nkadimeng
- Oratile Modiakgotla
- Wilson Legadima
- Realeboha Monaiwa

---

# Future Improvements

- Improved ML prediction accuracy
- Enhanced analytics dashboards
- Expanded healthcare integrations
- Enhanced notification systems
- Native mobile application support

---

# Deployment

Production URL:

https://care-queue-delta.vercel.app

---

# License

This project was developed for educational and healthcare improvement purposes.
