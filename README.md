[![codecov](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue/branch/main/graph/badge.svg)](https://codecov.io/gh/NkadimengKgothatso/SD-CareQueue)

# SD CareQueue

Community Clinic Appointment and Queue Management System


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
# Local Setup & Installation Guide

## Prerequisites

Before running the project locally, ensure you have the following installed:

- Node.js
- Python 3.10+
- Git
- Firebase project configuration
- pip

---

## 1. Clone the Repository

```bash
git clone https://github.com/NkadimengKgothatso/SD-CareQueue.git
cd SD-CareQueue
```

---

## 2. Install Frontend Dependencies

If your project uses npm packages:

```bash
npm install
```

If no package.json exists, you can skip this step.

---

## 3. Firebase Configuration

Create a Firebase configuration file:

```text
firebase-config.js
```

Add your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Important:

- Never commit Firebase secret keys
- Configure Firestore security rules
- Enable Firebase Authentication

---

## 4. Install Python Dependencies

Navigate to the ML API directory:

```bash
cd ml-api
```

Create a virtual environment.

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install required packages:

```bash
pip install -r requirements.txt
```

---

## 5. Run the Flask ML API

Start the prediction API server:

```bash
python app.py
```

The API will run locally on:

```text
http://127.0.0.1:5000/predict
```

---

## 6. Run the Frontend Application

Open the frontend project directory and launch the application.

If using a simple local server:

```bash
npx serve .
```

Or use the VS Code Live Server extension.

The application will typically run on:

```text
http://localhost:3000
```

---

## 7. Configure API Endpoint

Update the frontend ML endpoint configuration.

Example:

```javascript
const ML_API_URL = "http://127.0.0.1:5000/predict";
```

---

# Running Tests

## Run Jest Tests

```bash
npm test
```

## Run Coverage

```bash
npm run coverage
```

---

# Project Structure

```text
SD-CareQueue/
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── assets/
│
├── ml-api/
│   ├── app.py
│   ├── wait_time_model.pkl
│   ├── requirements.txt
│   └── scripts/
│
├── tests/
├── firebase/
├── docs/
└── README.md
```
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

# Deployment

Production URL:

https://care-queue-delta.vercel.app

---

# License

This project was developed for educational and healthcare improvement purposes.
