document.addEventListener("DOMContentLoaded", function () {
    const tagNameField = document.getElementById("id_tag_name");
    const customTagNameField = document.getElementById("id_custom_tag_name");

    // Toggles the visibility of the custom tag name field
    function toggleCustomTagNameField() {
        if (tagNameField.value === "custom") {
            customTagNameField.parentElement.style.display = ""; // Show the field
        } else {
            customTagNameField.parentElement.style.display = "none"; // Hide the field
            customTagNameField.value = ""; // Clear the value to avoid leftover input
        }
    }

    // Initialize the field visibility based on the current selection
    toggleCustomTagNameField();

    // Add an event listener to toggle visibility dynamically on dropdown changes
    tagNameField.addEventListener("change", toggleCustomTagNameField);
});
