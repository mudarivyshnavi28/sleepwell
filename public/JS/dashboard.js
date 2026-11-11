document.addEventListener('DOMContentLoaded', function () {

    let sleepChart = null;
    let qualityChart = null;
let monthlySleepChart = null;
    async function loadDashboard() {

        try {

            // 1. GET DASHBOARD DATA

            const response = await fetch('/api/dashboard');

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Unable to load dashboard data.');
            }

            const data = await response.json();


            // 2. DASHBOARD STATISTICS

            document.getElementById('userName').textContent =
                data.name || 'User';

            document.getElementById('sleepDuration').textContent =
                (Number(data.sleepDuration) || 0) + ' hrs';

            document.getElementById('waterIntake').textContent =
                (Number(data.waterIntake) || 0) + ' ml';

            document.getElementById('dailySteps').textContent =
                Number(data.steps) || 0;

            document.getElementById('exerciseMinutes').textContent =
                (Number(data.exerciseMinutes) || 0) + ' min';


            // 3. WATER INTAKE PROGRESS

            const dailyWaterGoal = 2000;
            const water = Number(data.waterIntake) || 0;

            const waterPercentage = Math.min(
                (water / dailyWaterGoal) * 100,
                100
            );

            document.getElementById('waterProgress').style.width =
                waterPercentage + '%';

            document.getElementById('waterPercentage').textContent =
                water >= dailyWaterGoal
                    ? '🎉 Daily water goal achieved!'
                    : waterPercentage.toFixed(1) + '% completed';


            // 4. LOAD SLEEP GOAL AND HISTORY

            const [goalResponse, historyResponse] = await Promise.all([
                fetch('/api/sleep-goal'),
                fetch('/api/history')
            ]);

            if (!goalResponse.ok || !historyResponse.ok) {
                throw new Error('Unable to load sleep information.');
            }

            const goalData = await goalResponse.json();
            const historyData = await historyResponse.json();

            const goal = Number(goalData.target_hours) || 8;

            document.getElementById('sleepGoal').textContent =
                goal + ' Hours';

            document.getElementById('targetHours').value = goal;


            // 5. LATEST SLEEP RECORD

            const sleepRecords = historyData.sleep || [];

            const latestSleep = sleepRecords.length > 0
                ? sleepRecords[0]
                : null;


            // 6. SLEEP GOAL PROGRESS

            let progress = 0;

            if (latestSleep && goal > 0) {
                progress =
                    (Number(latestSleep.duration) / goal) * 100;
            }

            progress = Math.min(progress, 100);

            document.getElementById('goalProgress').style.width =
                progress + '%';

            document.getElementById('goalPercentage').textContent =
                progress.toFixed(1) + '% completed';


            // 7. SLEEP QUALITY ANALYSIS

            const qualityElement =
                document.getElementById('sleepQuality');

            const qualityMessage =
                document.getElementById('qualityMessage');

            if (latestSleep && latestSleep.sleep_quality) {

                const quality = latestSleep.sleep_quality;

                qualityElement.textContent = quality;

                if (quality === 'Excellent') {

                    qualityMessage.textContent =
                        '🌟 Excellent! Keep maintaining your healthy sleep routine.';

                } else if (quality === 'Good') {

                    qualityMessage.textContent =
                        '💜 Good! Continue following your regular sleep schedule.';

                } else if (quality === 'Average') {

                    qualityMessage.textContent =
                        '🌙 Try maintaining a consistent bedtime and wake-up time.';

                } else {

                    qualityMessage.textContent =
                        '💤 Focus on improving your sleep routine.';

                }

            } else {

                qualityElement.textContent = 'Not Available';

                qualityMessage.textContent =
                    'Start recording your sleep to see your analysis.';

            }


            // 8. WEEKLY SLEEP SUMMARY

            const weeklySummary =
                document.getElementById('weeklySummary');

            if (sleepRecords.length > 0) {

                weeklySummary.innerHTML = sleepRecords
                    .slice(0, 7)
                    .map(record => `

                        <div class="card">

                            <p>
                                <strong>Date:</strong>
                                ${new Date(record.sleep_time).toLocaleDateString()}
                            </p>

                            <p>
                                <strong>Sleep Duration:</strong>
                                ${Number(record.duration).toFixed(2)} hours
                            </p>

                            <p>
                                <strong>Sleep Quality:</strong>
                                ${record.sleep_quality || 'Not specified'}
                            </p>

                        </div>

                    `).join('');

            } else {

                weeklySummary.innerHTML =
                    '<p>No sleep records yet. Start tracking your sleep!</p>';

            }


            // 9. PREPARE WEEKLY SLEEP RECORDS

            const chartRecords = sleepRecords
                .slice(0, 7)
                .reverse();

            const chartLabels = chartRecords.map(record =>
                new Date(record.sleep_time).toLocaleDateString()
            );

            const chartData = chartRecords.map(record =>
                Number(record.duration)
            );


            // 10. CALCULATE AVERAGE SLEEP

            let totalSleep = 0;

            chartRecords.forEach(record => {
                totalSleep += Number(record.duration);
            });

            const averageSleep = chartRecords.length > 0
                ? totalSleep / chartRecords.length
                : 0;

            document.getElementById('averageSleep').textContent =
                averageSleep.toFixed(2) + ' Hours';


            // 11. SLEEP CONSISTENCY ANALYSIS

            function calculateAverageTime(records, field) {

                if (records.length === 0) {
                    return '--:--';
                }

                let totalSin = 0;
                let totalCos = 0;

                records.forEach(record => {

                    const date = new Date(record[field]);

                    const minutes =
                        date.getHours() * 60 + date.getMinutes();

                    const angle = (minutes / 1440) * 2 * Math.PI;

                    totalSin += Math.sin(angle);
                    totalCos += Math.cos(angle);

                });

                let averageAngle = Math.atan2(totalSin, totalCos);

                if (averageAngle < 0) {
                    averageAngle += 2 * Math.PI;
                }

                const averageMinutes =
                    (averageAngle / (2 * Math.PI)) * 1440;

                const hours = Math.floor(averageMinutes / 60);
                const minutes = Math.round(averageMinutes % 60);

                const period = hours >= 12 ? 'PM' : 'AM';

                const displayHours = hours % 12 || 12;

                return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
            }


            // GET AVERAGE BEDTIME AND WAKE-UP TIME

            const averageBedtime = calculateAverageTime(
                chartRecords,
                'sleep_time'
            );

            const averageWakeTime = calculateAverageTime(
                chartRecords,
                'wake_time'
            );

            document.getElementById('averageBedtime').textContent =
                averageBedtime;

            document.getElementById('averageWakeTime').textContent =
                averageWakeTime;


            // CONSISTENCY MESSAGE

            const consistencyMessage =
                document.getElementById('consistencyMessage');

            if (chartRecords.length >= 2) {

                consistencyMessage.textContent =
                    'Your average bedtime and wake-up time are calculated from your recent sleep records.';

            } else {

                consistencyMessage.textContent =
                    'Record sleep for at least two days to explore your sleep schedule.';

            }


            // 12. WEEKLY SLEEP DURATION BAR CHART

            const ctx = document.getElementById('sleepChart');

            if (sleepChart) {
                sleepChart.destroy();
            }

            sleepChart = new Chart(ctx, {

                type: 'bar',

                data: {
                    labels: chartLabels,

                    datasets: [{
                        label: 'Sleep Duration (Hours)',
                        data: chartData,
                        backgroundColor: '#8b7cf6',
                        borderColor: '#6c5ce7',
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Hours'
                            }
                        },

                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }

                    },

                    plugins: {
                        legend: {
                            display: true
                        }
                    }

                }

            });


            // 13. SLEEP QUALITY DISTRIBUTION DOUGHNUT CHART

            const qualityCounts = {
                Excellent: 0,
                Good: 0,
                Average: 0,
                Poor: 0
            };

            sleepRecords.slice(0, 7).forEach(record => {

                const quality = String(
                    record.sleep_quality || ''
                ).trim();

                if (
                    Object.prototype.hasOwnProperty.call(
                        qualityCounts,
                        quality
                    )
                ) {
                    qualityCounts[quality]++;
                }

            });

            const qualityCanvas =
                document.getElementById('qualityChart');

            if (qualityChart) {
                qualityChart.destroy();
            }

            qualityChart = new Chart(qualityCanvas, {

                type: 'doughnut',

                data: {

                    labels: Object.keys(qualityCounts),

                    datasets: [{
                        label: 'Sleep Quality Records',
                        data: Object.values(qualityCounts),

                        backgroundColor: [
                            '#7c3aed',
                            '#16a34a',
                            '#f59e0b',
                            '#ef4444'
                        ],

                        borderWidth: 1
                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }

                }

            });
// 14. MONTHLY SLEEP REPORT

const today = new Date();

const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// Get current month's sleep records

const monthlyRecords = sleepRecords.filter(record => {

    const sleepDate = new Date(record.sleep_time);

    return (
        sleepDate.getMonth() === currentMonth &&
        sleepDate.getFullYear() === currentYear
    );

});


// TOTAL SLEEP RECORDS

document.getElementById('monthlyRecords').textContent =
    monthlyRecords.length;


// AVERAGE SLEEP DURATION

let monthlyTotal = 0;

monthlyRecords.forEach(record => {
    monthlyTotal += Number(record.duration);
});

const monthlyAverage = monthlyRecords.length > 0
    ? monthlyTotal / monthlyRecords.length
    : 0;

document.getElementById('monthlyAverage').textContent =
    monthlyAverage.toFixed(2) + ' Hours';


// BEST SLEEP DURATION

const bestSleep = monthlyRecords.length > 0
    ? Math.max(...monthlyRecords.map(record => Number(record.duration)))
    : 0;

document.getElementById('bestSleep').textContent =
    bestSleep.toFixed(2) + ' Hours';


// MOST COMMON SLEEP QUALITY

const qualityFrequency = {};

monthlyRecords.forEach(record => {

    const quality = String(record.sleep_quality || '').trim();

    if (quality) {
        qualityFrequency[quality] =
            (qualityFrequency[quality] || 0) + 1;
    }

});

let commonQuality = '--';

const qualityEntries = Object.entries(qualityFrequency);

if (qualityEntries.length > 0) {

    qualityEntries.sort((a, b) => b[1] - a[1]);

    commonQuality = qualityEntries[0][0];

}

document.getElementById('commonQuality').textContent =
    commonQuality;


// MONTHLY SLEEP CHART

const monthlyChartRecords = [...monthlyRecords].reverse();

const monthlyLabels = monthlyChartRecords.map(record =>
    new Date(record.sleep_time).toLocaleDateString()
);

const monthlyData = monthlyChartRecords.map(record =>
    Number(record.duration)
);

const monthlyCanvas =
    document.getElementById('monthlySleepChart');

if (monthlySleepChart) {
    monthlySleepChart.destroy();
}

monthlySleepChart = new Chart(monthlyCanvas, {

    type: 'line',

    data: {

        labels: monthlyLabels,

        datasets: [{

            label: 'Sleep Duration (Hours)',

            data: monthlyData,

            borderColor: '#8b7cf6',

            backgroundColor: 'rgba(139, 124, 246, 0.2)',

            fill: true,

            tension: 0.3,

            pointRadius: 5

        }]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        scales: {

            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Sleep Hours'
                }
            },

            x: {
                title: {
                    display: true,
                    text: 'Date'
                }
            }

        }

    }

});
// 15. DOWNLOAD MONTHLY PDF REPORT

const downloadButton = document.getElementById('downloadMonthlyReport');

downloadButton.addEventListener('click', function () {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const today = new Date();

    const monthName = today.toLocaleString('default', {
        month: 'long'
    });

    // Report heading
    doc.setFontSize(20);
    doc.text('SleepWell - Monthly Sleep Report', 20, 20);

    doc.setFontSize(12);
    doc.text('Month: ' + monthName + ' ' + today.getFullYear(), 20, 32);

    // Monthly statistics
    doc.text('Total Sleep Records: ' + monthlyRecords.length, 20, 48);

    doc.text(
        'Average Sleep: ' + monthlyAverage.toFixed(2) + ' Hours',
        20, 58
    );

    doc.text(
        'Best Sleep: ' + bestSleep.toFixed(2) + ' Hours',
        20, 68
    );

    doc.text('Most Common Sleep Quality: ' + commonQuality, 20, 78);

    // Sleep records table
    const tableData = monthlyRecords.map(record => [
        new Date(record.sleep_time).toLocaleDateString(),
        record.duration + ' Hours',
        record.sleep_quality || 'Not Available'
    ]);

    doc.autoTable({
        startY: 90,
        head: [['Date', 'Sleep Duration', 'Sleep Quality']],
        body: tableData,
        theme: 'grid'
    });

    // Download PDF
    doc.save('SleepWell_Monthly_Report.pdf');

});
        } catch (error) {

            console.error('Dashboard Error:', error);

        }

    }


    // 14. SAVE DAILY SLEEP GOAL

    const goalForm = document.getElementById('sleepGoalForm');

    goalForm.addEventListener('submit', async function (event) {

        event.preventDefault();

        const targetHours =
            document.getElementById('targetHours').value;

        const goalMessage =
            document.getElementById('goalMessage');

        try {

            const response = await fetch('/api/sleep-goal', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    target_hours: targetHours
                })

            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Unable to save goal.');
            }

            goalMessage.textContent =
                '✅ ' + result.message;

            await loadDashboard();

        } catch (error) {

            goalMessage.textContent =
                '❌ ' + error.message;

        }

    });


    // 15. LOAD DASHBOARD WHEN PAGE OPENS

    loadDashboard();

});