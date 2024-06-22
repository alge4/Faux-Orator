// Placeholder for future JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    const phaseRadios = document.querySelectorAll('input[name="phase"]');

    phaseRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            const phase = this.value;
            window.location.href = `/${phase}`;
        });
    });
});
