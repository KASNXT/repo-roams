// =======================
// CSRF Token Handling
// =======================

/**
 * Retrieve a named cookie (used for getting the CSRF token from browser cookies).
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.slice(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get the CSRF token from cookies
const csrftoken = getCookie("csrftoken");

// =======================
// Log Deletion Trigger
// =======================

/**
 * Start the log deletion process by sending a POST request to the server.
 */
function startDelete() {
    const clientConfigId = document.getElementById("client-config-id").value;

    if (!clientConfigId) {
        alert("Please select a station.");
        return;
    }

    fetch("/admin/opcua_mgr/delete-logs/", {
        method: "POST",
        headers: {
            "X-CSRFToken": csrftoken,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `client_config_id=${clientConfigId}&batch_size=500`,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to start deletion.");
            }
            // Start polling the progress
            updateProgress(clientConfigId);
        })
        .catch((error) => {
            console.error("Deletion failed:", error);
        });
}

// =======================
// Progress Bar Updater
// =======================

/**
 * Poll the server every second for the current deletion progress,
 * and update the progress bar visually.
 */
function updateProgress(clientConfigId) {
    const progressElem = document.getElementById("progress");

    const interval = setInterval(() => {
        fetch(`/admin/opcua_mgr/progress-status/${clientConfigId}/`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Progress endpoint returned an error.");
                }
                return response.json();
            })
            .then((data) => {
                const percent = data.percent || 0;
                progressElem.style.width = `${percent}%`;
                progressElem.textContent = `${percent}%`;

                if (percent >= 100) {
                    clearInterval(interval);
                    alert("✅ Logs deleted successfully.");
                }
            })
            .catch((error) => {
                console.error("Error fetching progress:", error);
                clearInterval(interval);
            });
    }, 1000); // Poll every second
}
