document.addEventListener('DOMContentLoaded', async function () {

    const sleepHistory = document.getElementById('sleepHistory');
    const healthHistory = document.getElementById('healthHistory');

    async function loadHistory() {

        try {

            const response = await fetch('/api/history');

            if (!response.ok) {
                throw new Error('Unable to load records');
            }

            const data = await response.json();

            // SLEEP HISTORY

            if (data.sleep.length === 0) {

                sleepHistory.innerHTML = '<p>No sleep records found.</p>';

            } else {

                sleepHistory.innerHTML = data.sleep.map(record => `
                    <div class="card">

                        <p><strong>Bedtime:</strong> ${new Date(record.sleep_time).toLocaleString()}</p>

                        <p><strong>Wake-up:</strong> ${new Date(record.wake_time).toLocaleString()}</p>

                        <p><strong>Duration:</strong> ${record.duration} hours</p>

                        <p><strong>Quality:</strong> ${record.sleep_quality || 'Not specified'}</p>

                        <button onclick="deleteRecord('sleep', ${record.id})">
                            Delete
                        </button>

                    </div>
                `).join('');

            }

            // HEALTH HISTORY

            if (data.health.length === 0) {

                healthHistory.innerHTML = '<p>No health records found.</p>';

            } else {

                healthHistory.innerHTML = data.health.map(record => `
                    <div class="card">

                        <p><strong>Date:</strong> ${new Date(record.record_date).toLocaleDateString()}</p>

                        <p><strong>Water Intake:</strong> ${record.water_intake} ml</p>

                        <p><strong>Steps:</strong> ${record.steps}</p>

                        <p><strong>Exercise:</strong> ${record.exercise_minutes} minutes</p>

                        <button onclick="deleteRecord('health', ${record.id})">
                            Delete
                        </button>

                    </div>
                `).join('');

            }

        } catch (error) {

            console.error(error);

            sleepHistory.innerHTML = '<p>Unable to load sleep history.</p>';
            healthHistory.innerHTML = '<p>Unable to load health history.</p>';

        }

    }


    // DELETE RECORD FUNCTION

    window.deleteRecord = async function (type, id) {

        const confirmDelete = confirm('Are you sure you want to delete this record?');

        if (!confirmDelete) {
            return;
        }

        try {

            const response = await fetch(`/api/${type}/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            alert(result.message);

            loadHistory();

        } catch (error) {

            alert(error.message);

        }

    };


    loadHistory();

});