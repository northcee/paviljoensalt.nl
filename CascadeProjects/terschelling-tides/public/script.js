// Chart.js configuratie
let tideChart = null;

// Datum helpers
function formatDate(date) {
    return date.toLocaleDateString('nl-NL', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('nl-NL');
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('nl-NL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// API functies
async function fetchTideData(startDate, endDate) {
    console.log('Fetching data for period:', startDate, 'to', endDate);
    
    const requestBody = {
        "Locatie": {
            "Code": "WESTTSLG",
            "X": 647723.414001695,
            "Y": 5914954.52555926
        },
        "AquoPlusWaarnemingMetadata": {
            "AquoMetadata": {
                "Compartiment": { "Code": "OW" },
                "Grootheid": { "Code": "WATHTBRKD" }
            }
        },
        "Periode": {
            "Begindatumtijd": startDate.toISOString(),
            "Einddatumtijd": endDate.toISOString()
        }
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch('/api/tide.py', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (!response.ok) {
            throw new Error(`Netwerkfout bij het ophalen van getijdendata: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Chart.js setup
function setupChart(labels, data, currentTimeIndex = null, showCurrentTime = false) {
    const ctx = document.getElementById('tideChart').getContext('2d');
    
    if (tideChart) {
        tideChart.destroy();
    }

    // Apple-inspired color scheme
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 122, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 122, 255, 0.0)');

    // Prepare annotations if showing current time
    const annotations = {};
    if (showCurrentTime && currentTimeIndex !== null) {
        annotations.currentTime = {
            type: 'line',
            xMin: currentTimeIndex,
            xMax: currentTimeIndex,
            borderColor: 'rgba(0, 122, 255, 0.5)',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
                display: true,
                content: 'Nu',
                position: 'start',
                backgroundColor: 'rgba(0, 122, 255, 0.9)',
                color: '#FFFFFF',
                font: {
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    size: 12,
                    weight: '500'
                },
                padding: {
                    x: 6,
                    y: 4
                },
                borderRadius: 4
            }
        };
        annotations.currentPoint = {
            type: 'point',
            xValue: currentTimeIndex,
            yValue: data[currentTimeIndex],
            backgroundColor: '#007AFF',
            borderColor: '#FFFFFF',
            borderWidth: 2,
            radius: 6
        };
    }

    tideChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waterhoogte',
                data: data,
                borderColor: '#007AFF',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.6,
                cubicInterpolationMode: 'monotone',
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#007AFF',
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    bodyFont: {
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        size: 14
                    },
                    titleFont: {
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        size: 14,
                        weight: '600'
                    },
                    padding: 12,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        title: (items) => {
                            return items[0].label + ' uur';
                        },
                        label: (item) => {
                            return `${item.formattedValue} cm`;
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            size: 12
                        },
                        color: '#666666'
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.06)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            size: 12
                        },
                        color: '#666666',
                        callback: (value) => `${value} cm`
                    }
                }
            }
        }
    });
}

// UI updates
function updateCurrentLevel(level, timestamp, trend = null, phase = null) {
    const currentLevelElement = document.getElementById('currentLevel');
    const timestampElement = document.getElementById('timestamp');
    const currentLevelContainer = document.getElementById('currentLevelContainer');
    const tideDirection = document.getElementById('tideDirection');
    const trendText = document.getElementById('trendText');
    const trendArrow = tideDirection.querySelector('.trend-arrow');
    const tideDot = document.querySelector('.tide-dot');

    if (level === null || timestamp === null) {
        currentLevelContainer.style.display = 'none';
        return;
    }

    currentLevelContainer.style.display = 'block';
    currentLevelElement.textContent = `${level} cm`;
    timestampElement.textContent = formatDateTime(timestamp);

    // Update trend arrow and text
    if (trend !== null) {
        tideDirection.style.display = 'block';
        if (trend > 0) {
            trendArrow.classList.remove('down');
            trendText.textContent = 'Opkomend';
        } else {
            trendArrow.classList.add('down');
            trendText.textContent = 'Afgaand';
        }
    }

    // Update phase indicator (0-100)
    if (phase !== null) {
        tideDot.style.left = `${phase}%`;
    }
}

// Global variable to store current water level data
let currentWaterLevelData = null;

// Helper function voor datum formatting
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('nl-NL', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Data verwerking
function processData(data, selectedDate) {
    try {
        if (!data.WaarnemingenLijst || !data.WaarnemingenLijst.length) {
            throw new Error('Geen getijdendata beschikbaar');
        }

        const measurements = data.WaarnemingenLijst[0].MetingenLijst;
        const timeLabels = [];
        const waterLevels = [];

        // Get current Dutch time
        const now = new Date();
        const dutchTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
        const currentHourMinutes = dutchTime.getHours() * 60 + dutchTime.getMinutes();

        let closestMeasurement = null;
        let smallestTimeDiff = Infinity;
        let closestIndex = 0;

        measurements.forEach((measurement, index) => {
            const timestamp = new Date(measurement.Tijdstip);
            const timeLabel = timestamp.toLocaleTimeString('nl-NL', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const level = measurement.Meetwaarde.Waarde_Numeriek;
            timeLabels.push(timeLabel);
            waterLevels.push(level);

            // Calculate time difference for current water level
            const measurementHourMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
            const timeDiff = Math.abs(currentHourMinutes - measurementHourMinutes);
            
            if (timeDiff < smallestTimeDiff) {
                smallestTimeDiff = timeDiff;
                closestMeasurement = {
                    level: level,
                    timestamp: measurement.Tijdstip
                };
                closestIndex = index;
            }
        });

        // Calculate trend and phase
        let trend = 0;
        let phase = 50; // Default to middle if we can't calculate

        if (closestIndex > 0 && closestIndex < waterLevels.length - 1) {
            trend = waterLevels[closestIndex + 1] - waterLevels[closestIndex - 1];

            let localMin = Math.min(...waterLevels);
            let localMax = Math.max(...waterLevels);
            let range = localMax - localMin;
            
            if (range > 0) {
                phase = ((waterLevels[closestIndex] - localMin) / range) * 100;
            }
        }

        // Check if we're looking at today
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();

        // Update the chart with the processed data and current time index (only if it's today)
        setupChart(timeLabels, waterLevels, closestIndex, isToday);

        // Only update current water level data if we're looking at today's data
        if (isToday && closestMeasurement) {
            currentWaterLevelData = {
                level: closestMeasurement.level,
                timestamp: closestMeasurement.timestamp,
                trend: trend,
                phase: phase
            };
        }

        // Always show the most recent water level data
        if (currentWaterLevelData) {
            updateCurrentLevel(
                currentWaterLevelData.level,
                currentWaterLevelData.timestamp,
                currentWaterLevelData.trend,
                currentWaterLevelData.phase
            );
        }

    } catch (error) {
        console.error('Fout bij het verwerken van getijdendata:', error);
        document.getElementById('error').textContent = 'Er is een fout opgetreden bij het verwerken van de getijdendata.';
    }
}

// Update current water level periodically
async function updateCurrentWaterLevel() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    try {
        const data = await fetchTideData(today, today);
        processData(data, now);
    } catch (error) {
        console.error('Error updating current water level:', error);
    }
}

// Hoofdfunctie
async function updateTideData(date) {
    try {
        // Set time to start of day (00:00:00)
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        // Set time to end of day (23:59:59)
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const data = await fetchTideData(startDate, endDate);
        processData(data, date);
        updateDateDisplay(date);
    } catch (error) {
        console.error('Fout bij het updaten van getijdendata:', error);
        document.getElementById('error').textContent = 'Er is een fout opgetreden bij het ophalen van de getijdendata.';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial update with current date
    const now = new Date();
    updateTideData(now);

    // Previous day button
    document.getElementById('prevDay').addEventListener('click', () => {
        const currentDate = new Date(document.getElementById('currentDate').textContent);
        currentDate.setDate(currentDate.getDate() - 1);
        updateTideData(currentDate);
    });

    // Next day button
    document.getElementById('nextDay').addEventListener('click', () => {
        const currentDate = new Date(document.getElementById('currentDate').textContent);
        currentDate.setDate(currentDate.getDate() + 1);
        updateTideData(currentDate);
    });

    // Today button
    document.getElementById('todayButton').addEventListener('click', () => {
        const now = new Date();
        updateTideData(now);
    });

    // Initial update
    updateCurrentWaterLevel();

    // Update every 5 minutes
    setInterval(updateCurrentWaterLevel, 5 * 60 * 1000);
});

function updateDateDisplay(date) {
    document.getElementById('currentDate').textContent = formatDate(date);
}
