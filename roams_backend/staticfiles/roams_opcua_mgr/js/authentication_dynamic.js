//authentication_dynamic.js file
// This file contains the JavaScript code to dynamically show/hide the username and password fields based on the Anonymous checkbox in the Authentication form.
// This file is used in the Authentication form of the OPC UA Manager application.
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ authentication_dynamic.js loaded");
    // Select elements for Anonymous toggle
    const anonymousCheckbox = document.querySelector("#id_Anonymous");
    const usernameFieldWrapper = document.querySelector("#id_username")?.closest(".form-row");
    const passwordFieldWrapper = document.querySelector("#id_password")?.closest(".form-row");

   
    // Function to toggle username and password fields
    function toggleAnonymousFields() {
        if (anonymousCheckbox?.checked) {
            // Hide username and password fields
            usernameFieldWrapper.style.display = "none";
            passwordFieldWrapper.style.display = "none";
        } else {
            // Show username and password fields
            usernameFieldWrapper.style.display = "block";
            passwordFieldWrapper.style.display = "block";
        }
    }


    // Add event listeners and initialize the state
    if (anonymousCheckbox) {
        anonymousCheckbox.addEventListener("change", toggleAnonymousFields);
        toggleAnonymousFields(); // Set initial state for Anonymous toggle
    }

    
});
