# CareQueue — ML Wait Time Predictor

CareQueue is a real-time healthcare queue management and machine learning prediction system designed to estimate patient wait times dynamically.

The system uses a Random Forest regression model trained on historical queue activity stored in Firebase Firestore. Predictions are generated in real time and displayed directly in the dashboard as queue conditions change.

---

# Features

- Real-time queue monitoring
- Machine learning wait time prediction
- Firebase Authentication integration
- Firestore real-time synchronization
- Automatic queue recalculation
- Random Forest regression model
- Flask prediction API
- Cloud deployment ready
- Multi-clinic support
- Live dashboard updates

---




✦ QueueHistory = ML training source
```

---

# Real-Time ML Prediction Workflow

```text
1. Patient books an appointment
         ↓
2. A new document is added to the Firestore Queues collection

   {
     appointmentId,
     clinicID,
     position,
     status: "waiting",
     estimateWait: 0
   }

         ↓
3. dashboard.js initializes and calls:

   loadQueueStatusML()

         ↓
4. Firestore onSnapshot() listeners monitor queue changes
   in real time

         ↓
5. waitTimeML.js calculates:
   • current queue position
   • total queue length
   • clinicID
   • walk-in status

         ↓
6. Frontend sends a POST request to:

   https://sd-carequeue.onrender.com/predict

         ↓
7. Flask API processes the request using the
   trained Random Forest model

         ↓
8. API returns a prediction:

   {
     "estimatedWaitTime": 28
   }

         ↓
9. waitTimeML.js updates:

   Queues.estimateWait

         ↓
10. Dashboard UI displays:

   "28 min"

         ↓
11. Whenever queue activity changes:
    • patient served
    • queue reordered
    • walk-in added
    • appointment cancelled

    Firestore triggers another onSnapshot() event,
    automatically recalculating the prediction.
```

---

# Folder Structure

```text
carequeue-ml/
├── scripts/
│   ├── 1_export_firestore.py
│   ├── 2_train_model.py
│   ├── 3_log_queue_history.py
│   └── generate_synthetic_data.py
│
├── api/
│   ├── app.py
│   └── wait_time_model.pkl
│
├── js/
│   └── waitTimeML.js
│
├── requirements.txt
└── README.md
```

---

# Setup

## 1. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 2. Configure Firebase

Download a Firebase service account key from:

```text
Firebase Console
→ Project Settings
→ Service Accounts
→ Generate New Private Key
```

Save the file as:

```text
scripts/serviceAccountKey.json
```

Add the following to `.gitignore`:

```text
serviceAccountKey.json
__pycache__/
*.pkl
```

---

# Machine Learning Pipeline

## Phase 1 — Collect Queue Data

Completed queue events are stored in:

```text
QueueHistory
```

This collection becomes the machine learning training dataset.

Recommended dataset size:

| Records | Quality |
|---|---|
| < 200 | Too small |
| 200 – 1000 | Acceptable |
| 1000+ | Recommended |

---

## Phase 2 — Export & Train

```bash
cd scripts

python 1_export_firestore.py
python 2_train_model.py
```

Output:

```text
wait_time_model.pkl
```

Copy the trained model into the API directory:

```bash
Copy-Item wait_time_model.pkl ..\api\wait_time_model.pkl
```

---

## Phase 3 — Run the Flask API

```bash
cd api
python app.py
```

API endpoint:

```text
http://localhost:5000/predict
```

---

## Phase 4 — Frontend Integration

Update the API URL inside:

```text
js/waitTimeML.js
```

```js
const ML_API_URL = "https://sd-carequeue.onrender.com/predict";
```

Import the ML loader:

```js
import { loadQueueStatusML } from "./waitTimeML.js";
```

Replace:

```js
loadQueueStatus(...)
```

With:

```js
loadQueueStatusML(...)
```

---

# API Example

## Request

```json
{
  "clinicID": 10002143430,
  "queuePosition": 3,
  "queueLength": 10
}
```

## Response

```json
{
  "estimatedWaitTime": 28,
  "unit": "minutes"
}
```

---

# Model Features

The Random Forest model uses the following features:

| Feature | Description |
|---|---|
| clinicID | Clinic identifier |
| queuePosition | Current patient queue position |
| queueLength | Total active queue size |
| hour | Current hour |
| dayOfWeek | Current weekday |

Target variable:

```text
actualWaitTime
```

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

# Deployment

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Flask ML API hosting |
| Firebase | Authentication + Firestore |
| Flask | Prediction API |
| Scikit-learn | ML model training |

---

# Procfile

For Render deployment:

```text
web: python api/app.py
```

---

# Security & Privacy

The ML system stores queue metadata only.

The system does NOT process:
- medical records
- diagnoses
- patient notes
- sensitive healthcare information

Recommended security practices:

- Enable Firebase Authentication
- Restrict Firestore rules to authenticated staff
- Never commit serviceAccountKey.json
- Use HTTPS for all API traffic

---

# Scalability

The architecture supports:

- real-time updates
- multiple clinics
- concurrent queue monitoring
- cloud deployment
- future model retraining
- additional predictive features
- production ML scaling

---

# Technologies Used

- Python
- Flask
- Firebase Authentication
- Firestore
- JavaScript
- Random Forest Regression
- Scikit-learn
- Render
- Vercel

---

# Future Improvements

Planned enhancements:

- doctor workload prediction
- queue congestion forecasting
- patient priority weighting
- WebSocket-based live updates
- automated model retraining
- advanced analytics dashboard
- multi-model ML experimentation

---

# Authors

CareQueue Development Team

```
