import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
  authDomain: "carequeue-284bb.firebaseapp.com",
  projectId: "carequeue-284bb",
  storageBucket: "carequeue-284bb.firebasestorage.app",
  messagingSenderId: "702048481855",
  appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadClinics() {
  try {
    // ✅ Use fs instead of fetch — this is a Node.js script
    const raw = fs.readFileSync("./Documentation/clinics_cleaned.json", "utf-8");
    const clinics = JSON.parse(raw);

    console.log("Loaded:", clinics.length, "clinics");

    for (const clinic of clinics) {
      try {
        if (!clinic.id || !clinic.name) {
          console.warn("Skipping invalid entry:", clinic);
          continue;
        }

        // Map JSON fields to match what clinicManagement.js expects
        await setDoc(doc(db, "clinicsObjects", String(clinic.id)), {
          name:          clinic.name,
          address:       clinic.address       ?? "Unknown Address",
          status:        "Active",             // default — not in JSON
          service:       ["General"],          // default — not in JSON
          opening_hours: clinic.opening_hours ?? "Hours not available",
          province:      clinic.province       ?? "Unknown",
          latitude:      clinic.latitude       ?? null,
          longitude:     clinic.longitude      ?? null,
        });

        console.log("✅ Uploaded:", clinic.name);
      } catch (err) {
        console.error("❌ Failed:", clinic.name, err.message);
      }
    }

    console.log("DONE");
  } catch (err) {
    console.error("Upload failed:", err);
  }
}

uploadClinics();