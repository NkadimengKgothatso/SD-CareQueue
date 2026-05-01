// signup firebse code 

        import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

        const firebaseConfig = {
            apiKey:            "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
            authDomain:        "carequeue-284bb.firebaseapp.com",
            projectId:         "carequeue-284bb",
            storageBucket:     "carequeue-284bb.firebasestorage.app",
            messagingSenderId: "702048481855",
            appId:             "1:702048481855:web:1bb9675ecadb9e22043e8a"
        };

        const app  = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // If not signed in, redirect back to login
        onAuthStateChanged(auth, (user) => {
            if (!user) window.location.href = "../index.html";
        });
       
        // Sign out
        window.signOut = async function() {
            await signOut(auth);
            window.location.href = "/index.html";
        };

         //to make them accessable on other filees
        export { auth, db, signOut, onAuthStateChanged }
   
