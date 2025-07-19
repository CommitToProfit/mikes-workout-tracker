// Fly-out functionality
function toggleFlyout() {
    const flyout = document.getElementById('dataFlyout');
    flyout.classList.toggle('open');
}

function closeFlyout() {
    const flyout = document.getElementById('dataFlyout');
    flyout.classList.remove('open');
}

// Close flyout when clicking outside or pressing ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeFlyout();
    }
});

// Update the exportData function to close flyout after export
const originalExportData = exportData;
exportData = function() {
    originalExportData();
    closeFlyout();
};
