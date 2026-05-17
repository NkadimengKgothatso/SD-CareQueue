import fs from "fs";

import { initializeApp } from "firebase/app";

import {
  getFirestore,
  doc,
  setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "carequeue-284bb.firebaseapp.com",
  projectId: "carequeue-284bb",
  storageBucket: "carequeue-284bb.firebasestorage.app",
  messagingSenderId: "702048481855",
  appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const clinics = JSON.parse(
  fs.readFileSync("./Documentation/clinics_cleaned.json", "utf8")
);

async function uploadClinics() {
  try {
    for (const clinic of clinics) {
      if (!clinic.id || !clinic.name) continue;

      await setDoc(
        doc(db, "clinicsObjects", String(clinic.id)),
        clinic
      );

      console.log(`Uploaded: ${clinic.name}`);
    }

    console.log("All clinics uploaded successfully");

  } catch (error) {
    console.error("Upload failed:", error);
  }
}

uploadClinics();