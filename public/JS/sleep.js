document.addEventListener('DOMContentLoaded', function () {

    const sleepTime = document.getElementById('sleepTime');
    const wakeTime = document.getElementById('wakeTime');
    const duration = document.getElementById('duration');
    const sleepForm = document.getElementById('sleepForm');

    function calculateDuration() {

        if (!sleepTime.value || !wakeTime.value) {
            duration.textContent = '0 hours';
            return;
        }

        const start = new Date(sleepTime.value);
        const end = new Date(wakeTime.value);

        const difference = end.getTime() - start.getTime();

        if (difference <= 0 || difference > 86400000) {
            duration.textContent = 'Invalid time';
            return;
        }

        const totalMinutes = Math.floor(difference / 60000);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        duration.textContent = `${hours} hours ${minutes} minutes`;
    }

    sleepTime.addEventListener('input', calculateDuration);
    wakeTime.addEventListener('input', calculateDuration);

    sleepForm.addEventListener('submit', function (event) {

        calculateDuration();

        if (
            !sleepTime.value ||
            !wakeTime.value ||
            duration.textContent === 'Invalid time'
        ) {
            event.preventDefault();
            alert('Please enter valid bedtime and wake-up time.');
        }

    });

});