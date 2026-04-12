// signup firebse code 


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

        // If not signed in, redirect back to login
        onAuthStateChanged(auth, (user) => {
            if (!user) window.location.href = "../Login/index.html";
        });

        // Sign out
        window.signOut = async function() {
            await signOut(auth);
            window.location.href = "../Login/index.html";
        };
   
// ================= highlight active page =================
  const currentPage = window.location.pathname.split("/").pop();

const links = document.querySelectorAll("aside nav ul li a");

links.forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active");
    }
});