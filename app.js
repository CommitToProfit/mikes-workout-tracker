// Data storage with more default exercises
let exercises = JSON.parse(localStorage.getItem('exercises')) || [
    {name: 'pushups', metrics: ['reps']},
    {name: 'pull-ups', metrics: ['reps']},
    {name: 'chin-ups', metrics: ['reps']}
];
let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
let importedData = null;
let editingWorkoutIndex = -1;

// Migrate old exercise format to new format
function migrateExercises() {
    let needsMigration = false;
    exercises = exercises.map(exercise => {
        if (typeof exercise === 'string') {
            needsMigration = true;
            return {name: exercise, metrics: ['reps']};
        }
        return exercise;
    });
    
    if (needsMigration) {
        localStorage.setItem('exercises', JSON.stringify(exercises));
    }
}

// Initialize workout data for existing exercises
exercises.forEach(exercise => {
    const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
    if (!workoutData[exerciseName]) {
        workoutData[exerciseName] = [];
    }
});

let currentExercise = 'pushups';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    migrateExercises();
    populateExerciseSelector();
    updateStats();
    displayWorkoutHistory();
    initializeChart();
    updateWorkoutInputs();
});

function getExerciseMetrics(exerciseName) {
    const exercise = exercises.find(ex => ex.name === exerciseName);
    return exercise ? exercise.metrics : ['reps'];
}

function populateExerciseSelector() {
    const selector = document.getElementById('exercise-select');
    selector.innerHTML = '';
    
    exercises.forEach(exercise => {
        const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
        const option = document.createElement('option');
        option.value = exerciseName;
        // Format display names properly
        let displayName = exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1);
        if (exerciseName === 'pull-ups') {
            displayName = 'Pull-ups (palms away)';
        } else if (exerciseName === 'chin-ups') {
            displayName = 'Chin-ups (palms toward you)';
        }
        option.textContent = displayName;
        selector.appendChild(option);
    });

    selector.addEventListener('change', function() {
        currentExercise = this.value;
        updateStats();
        displayWorkoutHistory();
        updateProgressView();
        updateWorkoutInputs();
        updateEditExerciseLink();
    });
    
    // Update the edit link on initial load
    updateEditExerciseLink();
}

function updateEditExerciseLink() {
    const editLink = document.getElementById('edit-exercise-link');
    if (!editLink) return;
    
    // Get base exercise name (remove parentheses and content)
    let baseName = currentExercise;
    const parenIndex = baseName.indexOf('(');
    if (parenIndex !== -1) {
        baseName = baseName.substring(0, parenIndex).trim();
    }
    
    // Capitalize first letter
    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    // Create the settings text
    let settingsText = baseName + ' Settings';
    
    // Truncate if too long (let's say 18 characters max to leave room for gear icon)
    if (settingsText.length > 18) {
        settingsText = settingsText.substring(0, 15) + '...';
    }
    
    editLink.textContent = '⚙️ ' + settingsText;
}

function updateWorkoutInputs() {
    const metrics = getExerciseMetrics(currentExercise);
    const inputContainer = document.querySelector('.workout-input');
    
    inputContainer.innerHTML = '';
    
    metrics.forEach(metric => {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        
        const label = document.createElement('label');
        label.setAttribute('for', metric + '-input');
        label.style.display = 'block';
        label.style.marginBottom = '10px';
        label.style.fontWeight = '600';
        label.style.color = '#555';
        
        const input = document.createElement('input');
        input.type = metric === 'time' ? 'text' : 'number';
        input.id = metric + '-input';
        input.style.width = '100%';
        input.style.padding = '15px';
        input.style.border = '2px solid #e0e0e0';
        input.style.borderRadius = '10px';
        input.style.fontSize = '18px';
        input.style.textAlign = 'center';
        input.style.transition = 'border-color 0.3s';
        input.min = metric !== 'time' ? '0' : undefined;
        
        switch(metric) {
            case 'reps':
                label.textContent = 'Reps Completed:';
                input.placeholder = 'Enter reps';
                break;
            case 'weight':
                label.textContent = 'Weight (lbs):';
                input.placeholder = 'Enter weight';
                input.step = '0.5';
                break;
            case 'time':
                label.textContent = 'Time (mm:ss):';
                input.placeholder = 'Enter time (e.g., 2:30)';
                break;
        }
        
        input.addEventListener('focus', function() {
            this.style.borderColor = '#667eea';
        });
        
        input.addEventListener('blur', function() {
            this.style.borderColor = '#e0e0e0';
        });
        
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                logWorkout();
            }
        });
        
        div.appendChild(label);
        div.appendChild(input);
        inputContainer.appendChild(div);
    });
}

function updateStats() {
    const data = workoutData[currentExercise] || [];
    const lastRepsEl = document.getElementById('last-reps');
    const avgRepsEl = document.getElementById('avg-reps');
    const metrics = getExerciseMetrics(currentExercise);

    if (data.length > 0) {
        const lastWorkout = data[data.length - 1];
        
        // Display last workout metrics
        let lastDisplay = '';
        if (lastWorkout.reps !== undefined) lastDisplay += lastWorkout.reps + ' reps';
        if (lastWorkout.weight !== undefined) {
            if (lastDisplay) lastDisplay += ', ';
            lastDisplay += lastWorkout.weight + ' lbs';
        }
        if (lastWorkout.time !== undefined) {
            if (lastDisplay) lastDisplay += ', ';
            lastDisplay += lastWorkout.time;
        }
        lastRepsEl.textContent = lastDisplay || '0';

        // Calculate averages for the primary metric
        if (metrics.includes('reps')) {
            const repsData = data.filter(w => w.reps !== undefined).map(w => w.reps);
            if (repsData.length > 0) {
                const avgReps = Math.round(repsData.reduce((sum, reps) => sum + reps, 0) / repsData.length);
                avgRepsEl.textContent = avgReps + ' reps';
            } else {
                avgRepsEl.textContent = '0';
            }
        } else if (metrics.includes('weight')) {
            const weightData = data.filter(w => w.weight !== undefined).map(w => w.weight);
            if (weightData.length > 0) {
                const avgWeight = Math.round((weightData.reduce((sum, weight) => sum + weight, 0) / weightData.length) * 10) / 10;
                avgRepsEl.textContent = avgWeight + ' lbs';
            } else {
                avgRepsEl.textContent = '0';
            }
        } else if (metrics.includes('time')) {
            const timeData = data.filter(w => w.time !== undefined).map(w => w.time);
            if (timeData.length > 0) {
                // Convert times to seconds for averaging
                const timeInSeconds = timeData.map(timeStr => {
                    const parts = timeStr.split(':');
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                });
                const avgSeconds = Math.round(timeInSeconds.reduce((sum, seconds) => sum + seconds, 0) / timeInSeconds.length);
                
                // Convert back to mm:ss format
                const avgMinutes = Math.floor(avgSeconds / 60);
                const remainingSeconds = avgSeconds % 60;
                avgRepsEl.textContent = avgMinutes + ':' + remainingSeconds.toString().padStart(2, '0');
            } else {
                avgRepsEl.textContent = '0';
            }
        } else {
            avgRepsEl.textContent = '0';
        }
    } else {
        lastRepsEl.textContent = '0';
        avgRepsEl.textContent = '0';
    }
}

function logWorkout() {
    const metrics = getExerciseMetrics(currentExercise);
    const workout = {
        date: new Date().toISOString(),
        exercise: currentExercise
    };
    
    let hasValidInput = false;
    
    metrics.forEach(metric => {
        const input = document.getElementById(metric + '-input');
        if (input && input.value.trim()) {
            if (metric === 'time') {
                // Validate time format (mm:ss or just seconds)
                const timeValue = input.value.trim();
                if (timeValue.includes(':')) {
                    const parts = timeValue.split(':');
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        workout[metric] = timeValue;
                        hasValidInput = true;
                    }
                } else if (!isNaN(timeValue)) {
                    // Convert seconds to mm:ss format
                    const minutes = Math.floor(timeValue / 60);
                    const seconds = timeValue % 60;
                    workout[metric] = minutes + ':' + seconds.toString().padStart(2, '0');
                    hasValidInput = true;
                }
            } else {
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                    workout[metric] = value;
                    hasValidInput = true;
                }
            }
        }
    });

    if (!hasValidInput) {
        alert('Please enter valid values for at least one metric');
        return;
    }

    if (!workoutData[currentExercise]) {
        workoutData[currentExercise] = [];
    }

    workoutData[currentExercise].push(workout);
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    // Clear inputs
    metrics.forEach(metric => {
        const input = document.getElementById(metric + '-input');
        if (input) input.value = '';
    });
    
    updateStats();
    displayWorkoutHistory();
    updateProgressView();

    // Show success feedback with baby blue color
    const button = document.querySelector('.button[onclick="logWorkout()"]');
    if (button) {
        const originalText = button.textContent;
        button.textContent = 'Logged! 🎉';
        button.style.background = 'rgb(79, 172, 254)';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 2000);
    }
}

function displayWorkoutHistory() {
    const historyContainer = document.getElementById('workout-history');
    const data = workoutData[currentExercise] || [];

    if (data.length === 0) {
        historyContainer.innerHTML = '<div class="no-data">No workouts recorded yet. Start your first workout!</div>';
        return;
    }

    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyContainer.innerHTML = sortedData.map((workout, sortedIndex) => {
        const date = new Date(workout.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Find the original index in the unsorted array
        const originalIndex = data.findIndex(w => 
            w.date === workout.date && 
            JSON.stringify(w) === JSON.stringify(workout)
        );
        
        // Format workout display
        let workoutDisplay = '';
        if (workout.reps !== undefined) workoutDisplay += workout.reps + ' reps';
        if (workout.weight !== undefined) {
            if (workoutDisplay) workoutDisplay += ', ';
            workoutDisplay += workout.weight + ' lbs';
        }
        if (workout.time !== undefined) {
            if (workoutDisplay) workoutDisplay += ', ';
            workoutDisplay += workout.time;
        }
        
        return '<div class="history-item">' +
            '<div class="date">' + formattedDate + '</div>' +
            '<div class="reps">' + workoutDisplay + '</div>' +
            '<div class="workout-actions">' +
                '<button class="edit-btn" onclick="editWorkout(' + originalIndex + ')" title="Edit workout">✏️</button>' +
                '<button class="delete-btn" onclick="deleteWorkout(' + originalIndex + ')" title="Delete workout">🗑️</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function showAddExerciseModal() {
    document.getElementById('add-exercise-modal').style.display = 'block';
    
    // Reset checkboxes
    document.getElementById('track-reps').checked = true;
    document.getElementById('track-weight').checked = false;
    document.getElementById('track-time').checked = false;
}

function hideAddExerciseModal() {
    document.getElementById('add-exercise-modal').style.display = 'none';
    document.getElementById('new-exercise-name').value = '';
}

function addNewExercise() {
    const exerciseName = document.getElementById('new-exercise-name').value.trim().toLowerCase();
    
    if (!exerciseName) {
        alert('Please enter an exercise name');
        return;
    }

    if (exercises.find(ex => ex.name === exerciseName)) {
        alert('Exercise already exists');
        return;
    }

    const metrics = [];
    if (document.getElementById('track-reps').checked) metrics.push('reps');
    if (document.getElementById('track-weight').checked) metrics.push('weight');
    if (document.getElementById('track-time').checked) metrics.push('time');
    
    if (metrics.length === 0) {
        alert('Please select at least one metric to track');
        return;
    }

    exercises.push({name: exerciseName, metrics: metrics});
    workoutData[exerciseName] = [];
    
    localStorage.setItem('exercises', JSON.stringify(exercises));
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    
    populateExerciseSelector();
    hideAddExerciseModal();
}

function showEditExerciseModal() {
    const exercise = exercises.find(ex => ex.name === currentExercise);
    if (!exercise) return;
    
    document.getElementById('edit-exercise-name').value = currentExercise;
    document.getElementById('edit-track-reps').checked = exercise.metrics.includes('reps');
    document.getElementById('edit-track-weight').checked = exercise.metrics.includes('weight');
    document.getElementById('edit-track-time').checked = exercise.metrics.includes('time');
    
    document.getElementById('edit-exercise-modal').style.display = 'block';
}

function hideEditExerciseModal() {
    document.getElementById('edit-exercise-modal').style.display = 'none';
}

function updateExercise() {
    const currentData = workoutData[currentExercise] || [];
    const newName = document.getElementById('edit-exercise-name').value.trim().toLowerCase();
    const newMetrics = [];
    
    if (document.getElementById('edit-track-reps').checked) newMetrics.push('reps');
    if (document.getElementById('edit-track-weight').checked) newMetrics.push('weight');
    if (document.getElementById('edit-track-time').checked) newMetrics.push('time');
    
    if (newMetrics.length === 0) {
        alert('Please select at least one metric to track');
        return;
    }
    
    if (!newName) {
        alert('Please enter an exercise name');
        return;
    }
    
    // Check if name is changing and new name already exists
    if (newName !== currentExercise && exercises.find(ex => ex.name === newName)) {
        alert('An exercise with this name already exists');
        return;
    }
    
    const exercise = exercises.find(ex => ex.name === currentExercise);
    const oldMetrics = exercise.metrics;
    
    // Check if we're adding new metrics to an exercise with existing data
    const addingMetrics = newMetrics.some(metric => !oldMetrics.includes(metric));
    
    if (addingMetrics && currentData.length > 0) {
        // Store the new name for later use in the hybrid options
        document.getElementById('edit-exercise-name').setAttribute('data-new-name', newName);
        showMetricUpdateOptions(newMetrics);
    } else {
        // Safe to update directly
        
        // Handle name change
        if (newName !== currentExercise) {
            // Update exercise name
            exercise.name = newName;
            
            // Move workout data to new name
            workoutData[newName] = workoutData[currentExercise];
            delete workoutData[currentExercise];
            
            // Update all workout records to reflect new exercise name
            workoutData[newName].forEach(workout => {
                workout.exercise = newName;
            });
            
            // Update current exercise reference
            currentExercise = newName;
        }
        
        exercise.metrics = newMetrics;
        localStorage.setItem('exercises', JSON.stringify(exercises));
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        populateExerciseSelector();
        document.getElementById('exercise-select').value = currentExercise;
        updateWorkoutInputs();
        updateStats();
        displayWorkoutHistory();
        updateProgressView();
        
        hideEditExerciseModal();
        alert('Exercise updated successfully!');
    }
}

function showMetricUpdateOptions(newMetrics) {
    document.getElementById('new-metrics-list').textContent = newMetrics.join(', ');
    document.getElementById('current-exercise-name').textContent = currentExercise;
    document.getElementById('metric-update-modal').style.display = 'block';
    hideEditExerciseModal();
}

function hideMetricUpdateModal() {
    document.getElementById('metric-update-modal').style.display = 'none';
}

function updateExistingExercise() {
    const newMetrics = [];
    if (document.getElementById('edit-track-reps').checked) newMetrics.push('reps');
    if (document.getElementById('edit-track-weight').checked) newMetrics.push('weight');
    if (document.getElementById('edit-track-time').checked) newMetrics.push('time');
    
    const newName = document.getElementById('edit-exercise-name').getAttribute('data-new-name') || currentExercise;
    const exercise = exercises.find(ex => ex.name === currentExercise);
    
    // Handle name change if needed
    if (newName !== currentExercise) {
        exercise.name = newName;
        workoutData[newName] = workoutData[currentExercise];
        delete workoutData[currentExercise];
        
        workoutData[newName].forEach(workout => {
            workout.exercise = newName;
        });
        
        currentExercise = newName;
    }
    
    exercise.metrics = newMetrics;
    
    localStorage.setItem('exercises', JSON.stringify(exercises));
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    
    populateExerciseSelector();
    document.getElementById('exercise-select').value = currentExercise;
    updateWorkoutInputs();
    updateStats();
    displayWorkoutHistory();
    updateProgressView();
    
    hideMetricUpdateModal();
    alert('Exercise updated! Future workouts will track: ' + newMetrics.join(', '));
}

function createNewVariant() {
    const baseName = currentExercise;
    const newName = prompt('Enter name for the new exercise variant:', baseName + ' (weighted)');
    
    if (!newName || newName.trim() === '') {
        return;
    }
    
    const finalName = newName.trim().toLowerCase();
    
    if (exercises.find(ex => ex.name === finalName)) {
        alert('An exercise with this name already exists');
        return;
    }
    
    const newMetrics = [];
    if (document.getElementById('edit-track-reps').checked) newMetrics.push('reps');
    if (document.getElementById('edit-track-weight').checked) newMetrics.push('weight');
    if (document.getElementById('edit-track-time').checked) newMetrics.push('time');
    
    exercises.push({name: finalName, metrics: newMetrics});
    workoutData[finalName] = [];
    
    localStorage.setItem('exercises', JSON.stringify(exercises));
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    
    // Switch to the new exercise
    currentExercise = finalName;
    populateExerciseSelector();
    document.getElementById('exercise-select').value = finalName;
    updateWorkoutInputs();
    updateStats();
    displayWorkoutHistory();
    updateProgressView();
    
    hideMetricUpdateModal();
    alert('New exercise variant created: ' + newName);
}

function showTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');

    if (tabName === 'progress') {
        updateProgressView();
    }
}

function showStatsView() {
    document.getElementById('stats-view-btn').classList.add('active');
    document.getElementById('chart-view-btn').classList.remove('active');
    document.getElementById('stats-view').style.display = 'block';
    document.getElementById('chart-view').style.display = 'none';
}

function showChartView() {
    document.getElementById('chart-view-btn').classList.add('active');
    document.getElementById('stats-view-btn').classList.remove('active');
    document.getElementById('chart-view').style.display = 'block';
    document.getElementById('stats-view').style.display = 'none';
    updateChart();
}

function updateProgressView() {
    updateStatsView();
}

function updateStatsView() {
    const data = workoutData[currentExercise] || [];
    const statsContainer = document.getElementById('stats-view');
    const metrics = getExerciseMetrics(currentExercise);
    
    if (data.length === 0) {
        statsContainer.innerHTML = '<div class="no-data">No workouts recorded yet. Start your first workout!</div>';
        return;
    }
    
    // Get display name for current exercise
    let exerciseDisplayName = currentExercise.charAt(0).toUpperCase() + currentExercise.slice(1);
    if (currentExercise === 'pull-ups') {
        exerciseDisplayName = 'Pull-ups';
    } else if (currentExercise === 'chin-ups') {
        exerciseDisplayName = 'Chin-ups';
    }
    
    // Calculate stats based on primary metric
    let primaryMetric = 'reps';
    if (metrics.includes('reps')) primaryMetric = 'reps';
    else if (metrics.includes('weight')) primaryMetric = 'weight';
    else if (metrics.includes('time')) primaryMetric = 'time';
    
    const metricData = data.filter(w => w[primaryMetric] !== undefined).map(w => w[primaryMetric]);
    let maxValue = 0, improvement = 0, avgValue = 0;
    
    if (metricData.length > 0) {
        if (primaryMetric === 'time') {
            // For time, we need to convert to seconds for comparison
            const timeInSeconds = metricData.map(timeStr => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            });
            maxValue = Math.max(...timeInSeconds);
            improvement = timeInSeconds.length > 1 ? timeInSeconds[timeInSeconds.length - 1] - timeInSeconds[0] : 0;
            avgValue = Math.round(timeInSeconds.reduce((sum, val) => sum + val, 0) / timeInSeconds.length);
            
            // Convert back to time format
            const maxMinutes = Math.floor(maxValue / 60);
            const maxSeconds = maxValue % 60;
            maxValue = maxMinutes + ':' + maxSeconds.toString().padStart(2, '0');
            
            const avgMinutes = Math.floor(avgValue / 60);
            const avgSecondsVal = avgValue % 60;
            avgValue = avgMinutes + ':' + avgSecondsVal.toString().padStart(2, '0');
        } else {
            maxValue = Math.max(...metricData);
            improvement = metricData.length > 1 ? metricData[metricData.length - 1] - metricData[0] : 0;
            avgValue = primaryMetric === 'weight' ? 
                Math.round((metricData.reduce((sum, val) => sum + val, 0) / metricData.length) * 10) / 10 :
                Math.round(metricData.reduce((sum, val) => sum + val, 0) / metricData.length);
        }
    }
    
    const metricLabel = primaryMetric === 'reps' ? 'reps' : primaryMetric === 'weight' ? 'lbs' : '';
    const improvementLabel = primaryMetric === 'time' ? 'sec' : metricLabel;
    
    statsContainer.innerHTML = 
        '<div style="background: white; border-radius: 15px; padding: 25px;">' +
            '<h3 style="text-align: center; margin-bottom: 25px; color: #333; font-size: 1.4em;">' +
                exerciseDisplayName + ' Progress' +
            '</h3>' +
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">' +
                '<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; color: white;">' +
                    '<div style="font-size: 2.2em; font-weight: bold; margin-bottom: 5px;">' + maxValue + (typeof maxValue === 'number' ? ' ' + metricLabel : '') + '</div>' +
                    '<div style="font-size: 1em; opacity: 0.9;">Personal Best</div>' +
                '</div>' +
                '<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; color: white;">' +
                    '<div style="font-size: 2.2em; font-weight: bold; margin-bottom: 5px;">' + (improvement > 0 ? '+' : '') + improvement + (typeof improvement === 'number' ? ' ' + improvementLabel : '') + '</div>' +
                    '<div style="font-size: 1em; opacity: 0.9;">Total Progress</div>' +
                '</div>' +
            '</div>' +
            '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">' +
                '<div style="font-size: 1.8em; font-weight: bold; color: #333; margin-bottom: 5px;">Average: ' + avgValue + (typeof avgValue === 'number' ? ' ' + metricLabel : '') + '</div>' +
                '<div style="font-size: 1em; color: #666;">' + data.length + ' workouts completed</div>' +
            '</div>' +
            '<div style="max-height: 250px; overflow-y: auto;">' +
                '<h4 style="margin-bottom: 15px; color: #555;">Recent Workouts</h4>' +
                data.slice(-10).reverse().map((workout, index) => {
                    const date = new Date(workout.date).toLocaleDateString();
                    const time = new Date(workout.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    let workoutDisplay = '';
                    if (workout.reps !== undefined) workoutDisplay += workout.reps + ' reps';
                    if (workout.weight !== undefined) {
                        if (workoutDisplay) workoutDisplay += ', ';
                        workoutDisplay += workout.weight + ' lbs';
                    }
                    if (workout.time !== undefined) {
                        if (workoutDisplay) workoutDisplay += ', ';
                        workoutDisplay += workout.time;
                    }
                    
                    return '<div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
                        '<div style="width: 100px; font-size: 0.9em; color: #666;">' +
                            '<div style="font-weight: 600;">' + date + '</div>' +
                            '<div style="font-size: 0.8em;">' + time + '</div>' +
                        '</div>' +
                        '<div style="flex: 1; margin: 0 15px; text-align: center;">' +
                            '<div style="font-weight: bold; color: #333; font-size: 1.1em;">' + workoutDisplay + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('') +
            '</div>' +
        '</div>';
}

function initializeChart() {
    updateChart();
}

function updateChart() {
    const canvas = document.getElementById('progress-chart');
    const data = workoutData[currentExercise] || [];
    const metrics = getExerciseMetrics(currentExercise);

    try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (data.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
            return;
        }

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        if (canvas.width === 0 || canvas.height === 0) {
            return;
        }

        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;

        // Choose primary metric for charting
        let primaryMetric = 'reps';
        if (metrics.includes('reps')) primaryMetric = 'reps';
        else if (metrics.includes('weight')) primaryMetric = 'weight';
        else if (metrics.includes('time')) primaryMetric = 'time';

        let values = data.filter(d => d[primaryMetric] !== undefined).map(d => d[primaryMetric]);
        
        // Convert time to seconds for charting
        if (primaryMetric === 'time') {
            values = values.map(timeStr => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            });
        }

        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const valueRange = maxValue - minValue || 1;

        // Draw axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Draw line
        if (values.length > 1) {
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.beginPath();

            values.forEach((value, index) => {
                const x = padding + (index / (values.length - 1)) * chartWidth;
                const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = '#667eea';
        values.forEach((value, index) => {
            const x = padding + (index / Math.max(values.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (valueRange * i / 5);
            const y = padding + chartHeight - (i / 5) * chartHeight;
            
            if (primaryMetric === 'time') {
                const minutes = Math.floor(value / 60);
                const seconds = Math.round(value % 60);
                ctx.fillText(minutes + ':' + seconds.toString().padStart(2, '0'), padding - 10, y + 4);
            } else {
                ctx.fillText(Math.round(value * 10) / 10, padding - 10, y + 4);
            }
        }

        // Title - get proper display name
        let exerciseDisplayName = currentExercise.charAt(0).toUpperCase() + currentExercise.slice(1);
        if (currentExercise === 'pull-ups') {
            exerciseDisplayName = 'Pull-ups';
        } else if (currentExercise === 'chin-ups') {
            exerciseDisplayName = 'Chin-ups';
        }
        
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(exerciseDisplayName + ' Progress (' + primaryMetric + ')', canvas.width / 2, 25);

    } catch (error) {
        console.log('Chart error:', error);
    }
}

// Export/Import Functions
function exportData() {
    const exportObj = {
        exercises: exercises,
        workoutData: workoutData,
        exportDate: new Date().toISOString(),
        version: "2.0"
    };

    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const today = new Date().toISOString().split('T')[0];
    const fileName = 'workout-data-' + today + '.json';
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Better success message with file info
    const totalWorkouts = Object.values(workoutData).reduce((sum, workouts) => sum + workouts.length, 0);
    
    alert(`✅ Backup successful!\n\nFile: ${fileName}\nExercises: ${exercises.length}\nTotal workouts: ${totalWorkouts}\n\n📱 Mobile tip: Check your Downloads folder or look for the file in your device's file manager.\n\n💡 Remember to email this file to yourself for extra backup!`);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.exercises || !data.workoutData) {
                alert('Invalid file format.');
                return;
            }

            importedData = data;
            
            const totalWorkouts = Object.values(data.workoutData).reduce((sum, workouts) => sum + workouts.length, 0);
            const exportDate = data.exportDate ? new Date(data.exportDate).toLocaleDateString() : 'Unknown';
            
            document.getElementById('import-message').innerHTML = 
                '<strong>Import Preview:</strong><br>' +
                '• ' + data.exercises.length + ' exercises<br>' +
                '• ' + totalWorkouts + ' total workouts<br>' +
                '• Export date: ' + exportDate + '<br><br>' +
                'This will replace all your current data. Continue?';
            
            document.getElementById('import-modal').style.display = 'block';
            
        } catch (error) {
            alert('Error reading file.');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function hideImportModal() {
    document.getElementById('import-modal').style.display = 'none';
    importedData = null;
}

function confirmImport() {
    if (!importedData) return;

    try {
        // Handle migration from old format if needed
        if (importedData.exercises && Array.isArray(importedData.exercises)) {
            exercises = importedData.exercises.map(exercise => {
                if (typeof exercise === 'string') {
                    return {name: exercise, metrics: ['reps']};
                }
                return exercise;
            });
        }
        
        workoutData = importedData.workoutData;
        
        localStorage.setItem('exercises', JSON.stringify(exercises));
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        populateExerciseSelector();
        updateStats();
        displayWorkoutHistory();
        updateProgressView();
        updateWorkoutInputs();
        
        hideImportModal();
        alert('Data imported successfully! 📥');
        
    } catch (error) {
        alert('Error importing data.');
    }
}

// Edit/Delete Functions
function editWorkout(index) {
    const data = workoutData[currentExercise] || [];
    if (index < 0 || index >= data.length) return;

    const workout = data[index];
    editingWorkoutIndex = index;

    populateEditExerciseSelector();
    document.getElementById('edit-exercise-select').value = currentExercise;
    
    // Initialize the input fields for the current exercise
    updateEditWorkoutInputs(currentExercise);
    
    // Populate metric inputs with the workout data
    const metrics = getExerciseMetrics(currentExercise);
    metrics.forEach(metric => {
        const input = document.getElementById('edit-' + metric + '-input');
        if (input) {
            input.value = workout[metric] || '';
        }
    });

    document.getElementById('edit-workout-modal').style.display = 'block';
}

function populateEditExerciseSelector() {
    const selector = document.getElementById('edit-exercise-select');
    selector.innerHTML = '';
    
    exercises.forEach(exercise => {
        const exerciseName = exercise.name;
        const option = document.createElement('option');
        option.value = exerciseName;
        // Format display names properly
        let displayName = exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1);
        if (exerciseName === 'pull-ups') {
            displayName = 'Pull-ups (palms away)';
        } else if (exerciseName === 'chin-ups') {
            displayName = 'Chin-ups (palms toward you)';
        }
        option.textContent = displayName;
        selector.appendChild(option);
    });
    
    // Add change handler to update inputs when exercise changes
    selector.addEventListener('change', function() {
        updateEditWorkoutInputs(this.value);
    });
}

function updateEditWorkoutInputs(exerciseName) {
    const metrics = getExerciseMetrics(exerciseName);
    const container = document.getElementById('edit-workout-inputs');
    
    container.innerHTML = '';
    
    metrics.forEach(metric => {
        const div = document.createElement('div');
        div.style.marginBottom = '20px';
        
        const label = document.createElement('label');
        label.setAttribute('for', 'edit-' + metric + '-input');
        label.style.display = 'block';
        label.style.marginBottom = '10px';
        label.style.fontWeight = '600';
        
        const input = document.createElement('input');
        input.type = metric === 'time' ? 'text' : 'number';
        input.id = 'edit-' + metric + '-input';
        input.style.width = '100%';
        input.style.padding = '15px';
        input.style.border = '2px solid #e0e0e0';
        input.style.borderRadius = '10px';
        input.style.fontSize = '16px';
        input.min = metric !== 'time' ? '0' : undefined;
        
        switch(metric) {
            case 'reps':
                label.textContent = 'Reps:';
                input.placeholder = 'Enter reps';
                break;
            case 'weight':
                label.textContent = 'Weight (lbs):';
                input.placeholder = 'Enter weight';
                input.step = '0.5';
                break;
            case 'time':
                label.textContent = 'Time (mm:ss):';
                input.placeholder = 'Enter time (e.g., 2:30)';
                break;
        }
        
        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    });
}

function hideEditWorkoutModal() {
    document.getElementById('edit-workout-modal').style.display = 'none';
    editingWorkoutIndex = -1;
}

function saveWorkoutEdit() {
    if (editingWorkoutIndex === -1) return;

    const newExercise = document.getElementById('edit-exercise-select').value;
    const newMetrics = getExerciseMetrics(newExercise);
    
    const oldData = workoutData[currentExercise] || [];
    const workout = oldData[editingWorkoutIndex];

    // Validate and collect new values
    let hasValidInput = false;
    const newWorkout = {
        date: workout.date,
        exercise: newExercise
    };
    
    newMetrics.forEach(metric => {
        const input = document.getElementById('edit-' + metric + '-input');
        if (input && input.value.trim()) {
            if (metric === 'time') {
                const timeValue = input.value.trim();
                if (timeValue.includes(':')) {
                    const parts = timeValue.split(':');
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        newWorkout[metric] = timeValue;
                        hasValidInput = true;
                    }
                } else if (!isNaN(timeValue)) {
                    const minutes = Math.floor(timeValue / 60);
                    const seconds = timeValue % 60;
                    newWorkout[metric] = minutes + ':' + seconds.toString().padStart(2, '0');
                    hasValidInput = true;
                }
            } else {
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                    newWorkout[metric] = value;
                    hasValidInput = true;
                }
            }
        }
    });

    if (!hasValidInput) {
        alert('Please enter valid values for at least one metric');
        return;
    }

    // Remove from old exercise
    oldData.splice(editingWorkoutIndex, 1);

    // Add to new exercise
    if (!workoutData[newExercise]) {
        workoutData[newExercise] = [];
    }
    workoutData[newExercise].push(newWorkout);

    // Sort by date
    workoutData[newExercise].sort((a, b) => new Date(a.date) - new Date(b.date));

    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    updateStats();
    displayWorkoutHistory();
    updateProgressView();

    hideEditWorkoutModal();
    
    alert('Workout updated successfully!');
}

function deleteWorkout(index) {
    const data = workoutData[currentExercise] || [];
    if (index < 0 || index >= data.length) return;

    const workout = data[index];
    editingWorkoutIndex = index;

    const date = new Date(workout.date);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let workoutDisplay = '';
    if (workout.reps !== undefined) workoutDisplay += workout.reps + ' reps';
    if (workout.weight !== undefined) {
        if (workoutDisplay) workoutDisplay += ', ';
        workoutDisplay += workout.weight + ' lbs';
    }
    if (workout.time !== undefined) {
        if (workoutDisplay) workoutDisplay += ', ';
        workoutDisplay += workout.time;
    }
    
    document.getElementById('delete-message').innerHTML = 
        'Are you sure you want to delete this workout?<br><br>' +
        '<strong>' + workoutDisplay + '</strong><br>' +
        formattedDate;

    document.getElementById('delete-workout-modal').style.display = 'block';
}

function hideDeleteWorkoutModal() {
    document.getElementById('delete-workout-modal').style.display = 'none';
    editingWorkoutIndex = -1;
}

function confirmDeleteWorkout() {
    if (editingWorkoutIndex === -1) return;

    const data = workoutData[currentExercise] || [];
    data.splice(editingWorkoutIndex, 1);

    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    updateStats();
    displayWorkoutHistory();
    updateProgressView();

    hideDeleteWorkoutModal();
    alert('Workout deleted successfully!');
}

// Modal click handlers
document.getElementById('add-exercise-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddExerciseModal();
    }
});

document.getElementById('import-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideImportModal();
    }
});

document.getElementById('edit-workout-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideEditWorkoutModal();
    }
});

document.getElementById('delete-workout-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideDeleteWorkoutModal();
    }
});

document.getElementById('edit-exercise-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideEditExerciseModal();
    }
});

document.getElementById('metric-update-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideMetricUpdateModal();
    }
});

// Enter key handlers
document.getElementById('new-exercise-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addNewExercise();
    }
});
