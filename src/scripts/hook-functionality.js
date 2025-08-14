// Hook Section Functionality
console.log('Hook functionality script loaded');

// Global state
let currentlyPlaying = null;
let currentAudio = null;

// Sample data
const sampleData = [
    {
        id: 'rock-anthem',
        title: 'Rock Anthem',
        description: 'High-energy rock track',
        analysis: { genre: 'Rock', mood: 'Energetic', tempo: '140 BPM', key: 'E Major' },
        summary: 'A powerful rock anthem with driving guitars and energetic drums.'
    },
    {
        id: 'interview-segment', 
        title: 'Interview Segment',
        description: 'Professional podcast audio',
        analysis: { genre: 'Spoken Word', mood: 'Professional', tempo: 'Variable', key: 'N/A' },
        summary: 'Clear, professional interview audio with excellent vocal clarity.'
    },
    {
        id: 'forest-ambience',
        title: 'Forest Ambience', 
        description: 'Natural soundscape',
        analysis: { genre: 'Ambient', mood: 'Peaceful', tempo: 'Slow', key: 'Natural' },
        summary: 'Serene forest sounds creating a peaceful, meditative atmosphere.'
    }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Hook functionality');
    
    // Initialize sample card click handlers
    const sampleCards = document.querySelectorAll('.sample-card');
    sampleCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking the play button
            if (e.target.closest('.play-btn')) return;
            
            const sampleId = card.dataset.sampleId;
            if (!sampleId) return;
            
            console.log('Sample card clicked:', sampleId);
            
            // Update selection UI
            updateSampleSelection(sampleId);
            
            // Start AI analysis simulation
            startAIAnalysis(sampleId);
        });
    });
    
    // Initialize play button handlers
    const playButtons = document.querySelectorAll('.play-btn');
    playButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            const sampleId = btn.dataset.sampleId;
            const audio = document.querySelector(`audio[data-sample-id="${sampleId}"]`);
            
            if (!audio || !sampleId) {
                console.error('Audio element or sample ID not found');
                return;
            }
            
            console.log('Play button clicked for:', sampleId);
            
            const playIcon = btn.querySelector('.play-icon');
            const pauseIcon = btn.querySelector('.pause-icon');
            const spinner = btn.querySelector('.loading-spinner');
            
            // If this audio is currently playing, pause it
            if (currentlyPlaying === sampleId) {
                console.log('Pausing current audio');
                audio.pause();
                if (playIcon) playIcon.classList.remove('hidden');
                if (pauseIcon) pauseIcon.classList.add('hidden');
                if (spinner) spinner.classList.add('hidden');
                currentlyPlaying = null;
                currentAudio = null;
                return;
            }
            
            // Reset all other audio
            resetAllAudio();
            
            // Show loading spinner
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');
            
            // Set up audio event listeners
            audio.addEventListener('loadedmetadata', function() {
                console.log('Audio metadata loaded for:', sampleId);
                if (spinner) spinner.classList.add('hidden');
                if (pauseIcon) pauseIcon.classList.remove('hidden');
                if (playIcon) playIcon.classList.add('hidden');
            });
            
            audio.addEventListener('ended', function() {
                console.log('Audio ended');
                resetAllAudio();
            });
            
            // Start playing
            currentlyPlaying = sampleId;
            currentAudio = audio;
            audio.play().catch(error => {
                console.error('Audio play failed:', error);
                if (spinner) spinner.classList.add('hidden');
                if (playIcon) playIcon.classList.remove('hidden');
                currentlyPlaying = null;
                currentAudio = null;
            });
        });
    });
    
    // Auto-select first sample
    if (sampleCards.length > 0) {
        setTimeout(() => {
            const firstCard = sampleCards[0];
            const sampleId = firstCard.dataset.sampleId;
            if (sampleId) {
                updateSampleSelection(sampleId);
                startAIAnalysis(sampleId);
            }
        }, 1000);
    }
});

// Function to update sample selection
function updateSampleSelection(sampleId) {
    // Remove selection indicators from all cards
    const sampleCards = document.querySelectorAll('.sample-card');
    sampleCards.forEach(card => {
        card.classList.remove('selected');
        const indicator = card.querySelector('.selection-indicator');
        if (indicator) indicator.style.opacity = '0';
    });
    
    // Add selection to current card
    const selectedCard = document.querySelector(`[data-sample-id="${sampleId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        const indicator = selectedCard.querySelector('.selection-indicator');
        if (indicator) indicator.style.opacity = '1';
    }
}

// Function to start AI analysis
function startAIAnalysis(sampleId) {
    const sample = sampleData.find(s => s.id === sampleId);
    if (!sample) return;
    
    console.log('Starting AI analysis for:', sampleId);
    
    // Hide status, show progress
    const statusEl = document.querySelector('.analysis-status');
    const progressEl = document.querySelector('.analysis-progress');
    const resultsEl = document.querySelector('.analysis-results');
    
    if (statusEl) statusEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.add('hidden');
    if (progressEl) progressEl.classList.remove('hidden');
    
    // Simulate AI analysis steps
    simulateAnalysisSteps(sample);
}

// Function to simulate analysis steps
function simulateAnalysisSteps(sample) {
    const steps = document.querySelectorAll('.progress-step');
    let currentStep = 0;
    
    function processNextStep() {
        if (currentStep < steps.length) {
            // Complete current step
            const step = steps[currentStep];
            const spinner = step.querySelector('.w-4.h-4.border-2.border-primary');
            const icon = step.querySelector('span');
            
            if (spinner) {
                spinner.className = 'w-4 h-4 bg-primary rounded-full';
            }
            if (icon) {
                icon.className = 'text-sm text-slate-300';
            }
            step.style.opacity = '1';
            
            // Start next step
            currentStep++;
            if (currentStep < steps.length) {
                const nextStep = steps[currentStep];
                const nextSpinner = nextStep.querySelector('.w-4.h-4.border-2.border-slate-500');
                if (nextSpinner) {
                    nextSpinner.className = 'w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin';
                }
                nextStep.style.opacity = '1';
                
                setTimeout(processNextStep, 1000 + Math.random() * 1000);
            } else {
                // Analysis complete
                setTimeout(() => showAnalysisResults(sample), 500);
            }
        }
    }
    
    // Start first step
    setTimeout(processNextStep, 500);
}

// Function to show analysis results
function showAnalysisResults(sample) {
    console.log('Showing analysis results for:', sample.id);
    
    // Hide progress, show results
    const progressEl = document.querySelector('.analysis-progress');
    const resultsEl = document.querySelector('.analysis-results');
    
    if (progressEl) progressEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.remove('hidden');
    
    // Populate results
    const genreEl = document.querySelector('.genre-result');
    const confidenceEl = document.querySelector('.confidence-score');
    const moodEl = document.querySelector('.mood-result');
    const energyEl = document.querySelector('.energy-level');
    const tempoEl = document.querySelector('.tempo-result');
    const keyEl = document.querySelector('.key-result');
    const insightEl = document.querySelector('.insight-text');
    
    if (genreEl && sample.analysis.genre) {
        genreEl.textContent = sample.analysis.genre;
    }
    if (confidenceEl) {
        confidenceEl.textContent = '96.8% confidence';
    }
    if (moodEl && sample.analysis.mood) {
        moodEl.textContent = sample.analysis.mood;
    }
    if (energyEl) {
        energyEl.textContent = 'High Energy';
    }
    if (tempoEl && sample.analysis.tempo) {
        tempoEl.textContent = sample.analysis.tempo;
    }
    if (keyEl && sample.analysis.key) {
        keyEl.textContent = sample.analysis.key;
    }
    if (insightEl) {
        insightEl.textContent = sample.summary || 'AI analysis complete. This audio shows strong characteristics typical of its genre.';
    }
    
    // Reset progress steps for next analysis
    resetProgressSteps();
}

// Function to reset progress steps
function resetProgressSteps() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        const spinner = step.querySelector('.w-4');
        const icon = step.querySelector('span');
        
        if (index === 0) {
            if (spinner) spinner.className = 'w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin';
            if (icon) icon.className = 'text-sm text-slate-300';
            step.style.opacity = '1';
        } else {
            if (spinner) spinner.className = 'w-4 h-4 border-2 border-slate-500 rounded-full';
            if (icon) icon.className = 'text-sm text-slate-400';
            step.style.opacity = '0.5';
        }
    });
}

// Function to reset all audio
function resetAllAudio() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    
    // Reset UI states
    document.querySelectorAll('.play-icon').forEach(icon => {
        icon.classList.remove('hidden');
    });
    document.querySelectorAll('.pause-icon').forEach(icon => {
        icon.classList.add('hidden');
    });
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.classList.add('hidden');
    });
    
    currentlyPlaying = null;
    currentAudio = null;
}
