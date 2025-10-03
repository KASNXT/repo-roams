//config_dynamic.js file
// This file contains the JavaScript code to dynamically show/hide the advanced properties fields based on the Show Advanced checkbox in the Configuration form.
// This file is used in the Configuration form of the OPC UA Manager application.
document.addEventListener("DOMContentLoaded", function () {
    
    // Select elements for Show Advanced toggle
    const showAdvancedCheckbox = document.querySelector("#id_show_advanced_properties");
    const sessionTimeoutWrapper = document.querySelector("#id_session_time_out")?.closest(".form-row");
    const secureTimeoutWrapper = document.querySelector("#id_secure_time_out")?.closest(".form-row");
    const connectionTimeoutWrapper = document.querySelector("#id_connection_time_out")?.closest(".form-row");
    const requestTimeoutWrapper = document.querySelector("#id_request_time_out")?.closest(".form-row");
    const acknowledgeTimeoutWrapper = document.querySelector("#id_acknowledge_time_out")?.closest(".form-row");
    const subscriptionIntervalWrapper = document.querySelector("#id_subscription_interval")?.closest(".form-row");


    // Function to toggle advanced fields
    function toggleAdvancedFields() {
        const advancedFields = [
            sessionTimeoutWrapper,
            secureTimeoutWrapper,
            connectionTimeoutWrapper,
            requestTimeoutWrapper,
            acknowledgeTimeoutWrapper,
            subscriptionIntervalWrapper,
        ];

        if (showAdvancedCheckbox?.checked) {
            // Show all advanced fields
            advancedFields.forEach((field) => {
                if (field) field.style.display = "block";
            });
        } else {
            // Hide all advanced fields
            advancedFields.forEach((field) => {
                if (field) field.style.display = "none";
            });
        }
    }

    
    if (showAdvancedCheckbox) {
        showAdvancedCheckbox.addEventListener("change", toggleAdvancedFields);
        toggleAdvancedFields(); // Set initial state for Advanced toggle
    }
});
