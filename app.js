// Data storage with more default exercises
let exercises = JSON.parse(localStorage.getItem('exercises')) || ['pushups', 'pull-ups', 'chin-ups'];
let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
let importedData = null;
let editingWorkoutIndex = -1;

// Initialize workout data for existing exercises
exercises.forEach(exercise => {
    if (!workoutData[exercise]) {
        workoutData[exercise] = [];
    }
});

let currentExercise = 'pushups';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    populateExerciseSelector();
    updateStats();
    displayWorkoutHistory();
    initializeChart();
});

function populateExerciseSelector() {
    const selector = document.getElementById('exercise-select');
    selector.innerHTML = '';
    
    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        // Format display names properly
        let displayName = exercise.charAt(0).toUpperCase() + exercise.slice(1);
        if (exercise === 'pull-ups') {
            displayName = 'Pull-ups (palms away)';
        } else if (exercise === 'chin-ups') {
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
    });
}

function updateStats() {
    const data = workoutData[currentExercise] || [];
    const lastRepsEl = document.getElementById('last-reps');
    const avgRepsEl = document.getElementById('avg-reps');

    if (data.length > 0) {
        const lastWorkout = data[data.length - 1];
        lastRepsEl.textContent = lastWorkout.reps;

        const avgReps = Math.round(data.reduce((sum, workout) => sum + workout.reps, 0) / data.length);
        avgRepsEl.textContent = avgReps;
    } else {
        lastRepsEl.textContent = '0';
        avgRepsEl.textContent = '0';
    }
}

function logWorkout() {
    const repsInput = document.getElementById('reps-input');
    const reps = parseInt(repsInput.value);

    if (!reps || reps <= 0) {
        alert('Please enter a valid number of reps');
        return;
    }

    const workout = {
        date: new Date().toISOString(),
        reps: reps,
        exercise: currentExercise
    };

    if (!workoutData[currentExercise]) {
        workoutData[currentExercise] = [];
    }

    workoutData[currentExercise].push(workout);
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    repsInput.value = '';
    updateStats();
    displayWorkoutHistory();
    updateProgressView();

    // Show success feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Logged! 🎉';
    button.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }, 2000);
}

function displayWorkoutHistory() {
    const historyContainer = document.getElementById('workout-history');
    const data = workoutData[currentExercise] || [];

    if (data.length === 0) {
        historyContainer.innerHTML = '<div class="no-data">No workouts recorded yet. Start your first workout!</div>';
        return;
    }

    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyContainer.innerHTML = sortedData.map((workout, index) => {
        const date = new Date(workout.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        return '<div class="history-item">' +
            '<div class="date">' + formattedDate + '</div>' +
            '<div class="reps">' + workout.reps + ' reps</div>' +
            '<div class="workout-actions">' +
                '<button class="edit-btn" onclick="editWorkout(' + index + ')" title="Edit workout">✏️</button>' +
                '<button class="delete-btn" onclick="deleteWorkout(' + index + ')" title="Delete workout">🗑️</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function showAddExerciseModal() {
    document.getElementById('add-exercise-modal').style.display = 'block';
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

    if (exercises.includes(exerciseName)) {
        alert('Exercise already exists');
        return;
    }

    exercises.push(exerciseName);
    workoutData[exerciseName] = [];
    
    localStorage.setItem('exercises', JSON.stringify(exercises));
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    
    populateExerciseSelector();
    hideAddExerciseModal();
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
    
    if (data.length === 0) {
        statsContainer.innerHTML = '<div class="no-data">No workouts recorded yet. Start your first workout!</div>';
        return;
    }
    
    const maxReps = Math.max(...data.map(d => d.reps));
    const improvement = data.length > 1 ? data[data.length - 1].reps - data[0].reps : 0;
    const avgReps = Math.round(data.reduce((sum, d) => sum + d.reps, 0) / data.length);
    
    // Get display name for current exercise
    let exerciseDisplayName = currentExercise.charAt(0).toUpperCase() + currentExercise.slice(1);
    if (currentExercise === 'pull-ups') {
        exerciseDisplayName = 'Pull-ups';
    } else if (currentExercise === 'chin-ups') {
        exerciseDisplayName = 'Chin-ups';
    }
    
    statsContainer.innerHTML = 
        '<div style="background: white; border-radius: 15px; padding: 25px;">' +
            '<h3 style="text-align: center; margin-bottom: 25px; color: #333; font-size: 1.4em;">' +
                exerciseDisplayName + ' Progress' +
            '</h3>' +
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">' +
                '<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; color: white;">' +
                    '<div style="font-size: 2.2em; font-weight: bold; margin-bottom: 5px;">' + maxReps + '</div>' +
                    '<div style="font-size: 1em; opacity: 0.9;">Personal Best</div>' +
                '</div>' +
                '<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; color: white;">' +
                    '<div style="font-size: 2.2em; font-weight: bold; margin-bottom: 5px;">' + (improvement > 0 ? '+' : '') + improvement + '</div>' +
                    '<div style="font-size: 1em; opacity: 0.9;">Total Progress</div>' +
                '</div>' +
            '</div>' +
            '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">' +
                '<div style="font-size: 1.8em; font-weight: bold; color: #333; margin-bottom: 5px;">Average: ' + avgReps + ' reps</div>' +
                '<div style="font-size: 1em; color: #666;">' + data.length + ' workouts completed</div>' +
            '</div>' +
            '<div style="max-height: 250px; overflow-y: auto;">' +
                '<h4 style="margin-bottom: 15px; color: #555;">Recent Workouts</h4>' +
                data.slice(-10).reverse().map((workout, index) => {
                    const date = new Date(workout.date).toLocaleDateString();
                    const time = new Date(workout.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    return '<div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
                        '<div style="width: 100px; font-size: 0.9em; color: #666;">' +
                            '<div style="font-weight: 600;">' + date + '</div>' +
                            '<div style="font-size: 0.8em;">' + time + '</div>' +
                        '</div>' +
                        '<div style="flex: 1; margin: 0 15px; text-align: center;">' +
                            '<div style="font-weight: bold; color: #333; font-size: 1.1em;">' + workout.reps + ' reps</div>' +
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

        const values = data.map(d => d.reps);
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
        if (data.length > 1) {
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.beginPath();

            values.forEach((value, index) => {
                const x = padding + (index / (data.length - 1)) * chartWidth;
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
            const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
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
            ctx.fillText(Math.round(value), padding - 10, y + 4);
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
        ctx.fillText(exerciseDisplayName + ' Progress', canvas.width / 2, 25);

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
        version: "1.0"
    };

    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'workout-data-' + new Date().toISOString().split('T')[0] + '.json';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Data exported successfully! 📤');
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
        exercises = importedData.exercises;
        workoutData = importedData.workoutData;
        
        localStorage.setItem('exercises', JSON.stringify(exercises));
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        populateExerciseSelector();
        updateStats();
        displayWorkoutHistory();
        updateProgressView();
        
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
    document.getElementById('edit-reps-input').value = workout.reps;

    document.getElementById('edit-workout-modal').style.display = 'block';
}

function populateEditExerciseSelector() {
    const selector = document.getElementById('edit-exercise-select');
    selector.innerHTML = '';
    
    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        // Format display names properly
        let displayName = exercise.charAt(0).toUpperCase() + exercise.slice(1);
        if (exercise === 'pull-ups') {
            displayName = 'Pull-ups (palms away)';
        } else if (exercise === 'chin-ups') {
            displayName = 'Chin-ups (palms toward you)';
        }
        option.textContent = displayName;
        selector.appendChild(option);
    });
}

function hideEditWorkoutModal() {
    document.getElementById('edit-workout-modal').style.display = 'none';
    editingWorkoutIndex = -1;
}

function saveWorkoutEdit() {
    if (editingWorkoutIndex === -1) return;

    const newExercise = document.getElementById('edit-exercise-select').value;
    const newReps = parseInt(document.getElementById('edit-reps-input').value);

    if (!newReps || newReps <= 0) {
        alert('Please enter a valid number of reps');
        return;
    }

    const oldData = workoutData[currentExercise] || [];
    const workout = oldData[editingWorkoutIndex];

    oldData.splice(editingWorkoutIndex, 1);

    workout.reps = newReps;
    workout.exercise = newExercise;

    if (!workoutData[newExercise]) {
        workoutData[newExercise] = [];
    }
    workoutData[newExercise].push(workout);

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
    
    document.getElementById('delete-message').innerHTML = 
        'Are you sure you want to delete this workout?<br><br>' +
        '<strong>' + workout.reps + ' ' + currentExercise + '</strong><br>' +
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

// Enter key handlers
document.getElementById('reps-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        logWorkout();
    }
});

document.getElementById('new-exercise-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addNewExercise();
    }
});
