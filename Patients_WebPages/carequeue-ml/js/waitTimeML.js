// ─────────────────────────────────────────────────────────────
// waitTimeML.js
// Standalone ML wait-time helper — all dependencies included.
// ─────────────────────────────────────────────────────────────

const ML_API_URL    = "https://sd-carequeue.onrender.com/predict";
const ML_HEALTH_URL = "https://sd-carequeue.onrender.com/health";

// ─────────────────────────────────────────────────────────────
// warmUpAPI
// ─────────────────────────────────────────────────────────────
// Pings /health to wake Render from cold start before the first
// real prediction call. Call once on page load.
export function warmUpAPI() {
    fetch(ML_HEALTH_URL).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// fetchWithTimeout
// ─────────────────────────────────────────────────────────────
// Wraps fetch with a timeout. Rejects with "timeout" if the
// server doesn't respond within `timeout` ms.
// 10000ms to survive Render cold starts (~30-60s on free tier).
async function fetchWithTimeout(url, options, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), timeout);
        fetch(url, options)
            .then(r => { clearTimeout(timer); resolve(r); })
            .catch(e => { clearTimeout(timer); reject(e); });
    });
}

// ─────────────────────────────────────────────────────────────
// getWaitTime — calls Flask ML API
// ─────────────────────────────────────────────────────────────
// Returns estimated wait time in minutes, or null on any failure
// so the caller can fall back to a default estimate.
export async function getWaitTime(data) {
    console.log("[ML] Calling API with:", JSON.stringify({
        clinicID:      Number(data.clinicID),
        queuePosition: Number(data.queuePosition),
        queueLength:   Number(data.queueLength),
        isWalkIn:      data.isWalkIn ? 1 : 0,
    }));

    try {
        const res = await fetchWithTimeout(ML_API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength:   Number(data.queueLength),
                isWalkIn:      data.isWalkIn ? 1 : 0,   // int not boolean
            }),
        }, 10000);

        console.log("[ML] Response status:", res.status);

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            console.error("[ML] API returned error:", errJson);
            return null;
        }

        const json = await res.json();
        console.log("[ML] API response:", json);
        return json?.estimatedWaitTime ?? null;

    } catch (e) {
        console.error("[ML] Fetch failed:", e.message);
        return null;
    }
}