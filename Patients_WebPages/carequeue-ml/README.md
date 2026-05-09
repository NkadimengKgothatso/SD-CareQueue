# CareQueue — ML Wait Time Predictor

Random Forest model that predicts patient queue wait times and feeds them
into your Firebase dashboard in real time.

---

## Folder structure

```
carequeue-ml/
├── scripts/
│   ├── 1_export_firestore.py     # pull Firestore → CSV
│   ├── 2_train_model.py          # train & save the model
│   └── 3_log_queue_history.py    # log completed queue entries
├── api/
│   └── app.py                    # Flask prediction API
├── js/
│   └── waitTimeML.js             # drop-in JS integration
├── requirements.txt
└── README.md
```

---

## Setup

### 1 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2 — Add your Firebase service account key

Download from:
**Firebase Console → Project Settings → Service Accounts → Generate new private key**

Save as `scripts/serviceAccountKey.json`  
⚠️ Never commit this file to Git — add it to `.gitignore`

---

## Workflow

### Phase 1 — Collect data (ongoing)

Every time a patient is called/served, call `log_queue_completion()` from
`scripts/3_log_queue_history.py`. This writes to the `QueueHistory` Firestore
collection which is your training data.

You need **at least 200 rows** before training is useful. 1 000+ is recommended.

### Phase 2 — Export & train

```bash
cd scripts

# Pull Firestore data to CSV
python 1_export_firestore.py

# Train the model (creates wait_time_model.pkl)
python 2_train_model.py
```

Retrain monthly or whenever you have significantly more data.

### Phase 3 — Run the API

```bash
cd api
python app.py
# → Listening on http://localhost:5000
```

Test it:
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"clinicID": 1, "queuePosition": 3, "queueLength": 12}'
```

Expected response:
```json
{
  "estimatedWaitTime": 34,
  "unit": "minutes",
  "inputs": { ... }
}
```

### Phase 4 — Connect to your dashboard

In `js/waitTimeML.js` update the API URL at the top:

```js
const ML_API_URL = "https://your-deployed-api.com/predict";
```

Then in `dashboard.js`, replace your `loadQueueStatus` call:

```js
import { loadQueueStatusML } from "./waitTimeML.js";

// Inside loadAppointments(), replace:
// loadQueueStatus(userId, next.id, next.clinicID);
// with:
loadQueueStatusML(userId, next.id, next.clinicID, db, (unsub) => {
    queueUnsubscribe = unsub;
});
```

---

## Accuracy targets

| MAE (minutes) | Quality |
|---|---|
| ≤ 5 min | ✅ Excellent |
| 5 – 10 min | ⚠ Acceptable |
| > 10 min | ❌ Needs more data |

---

## Deploying the API to production

Options (cheapest first):

| Platform | Cost | Notes |
|---|---|---|
| Railway.app | Free tier | Easy, 1-click deploy |
| Render.com | Free tier | Sleeps after inactivity |
| Google Cloud Run | Pay per request | Best for Firebase projects |
| Firebase Cloud Functions | Pay per call | Needs Node wrapper for Python |

For Railway / Render, add a `Procfile`:
```
web: python api/app.py
```

---

## Privacy note

`QueueHistory` stores appointment IDs and timestamps but no personal data
(no names, no medical info). This is safe under POPIA as long as your
Firestore security rules restrict access to authenticated clinic staff.