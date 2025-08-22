/**
 * Frontend Voice Analysis Debug Script
 * Run this in browser console to verify voice analysis data flow
 */

console.log('🔍 Voice Analysis Frontend Debug');
console.log('================================\n');

// Test data structure (paste your API response here)
const testApiResponse = {
    "success": true,
    "data": {
        "id": "c87edbde-0745-401d-8d7d-c293f255005e",
        "filename": "717257__iceofdoom__i-just-farted-in-it.wav",
        "contentType": {
            "primary": "mixed",
            "confidence": 0.95,
            "description": "The audio contains a clear instance of human speech alongside what sounds like a fart sound effect."
        },
        "voiceAnalysis": {
            "hasVoice": true,
            "speakerCount": 1,
            "genderDetection": {
                "primary": "male",
                "confidence": 0.8,
                "multipleGenders": false
            },
            "speakerEmotion": {
                "primary": "neutral",
                "confidence": 0.7,
                "emotions": {
                    "happy": 0.2,
                    "sad": 0.1,
                    "angry": 0,
                    "calm": 0.5,
                    "excited": 0.1,
                    "nervous": 0,
                    "confident": 0.2,
                    "stressed": 0
                }
            },
            "speechClarity": {
                "score": 0.9,
                "pronunciation": 0.95,
                "articulation": 0.9,
                "pace": "normal",
                "volume": "normal"
            },
            "languageAnalysis": {
                "language": "English",
                "confidence": 0.99,
                "accent": "unknown"
            }
        },
        "basicInfo": {
            "speechiness": 0.8
        }
    }
};

console.log('📊 Test Data Verification:');
console.log('==========================');
console.log('✅ contentType.primary:', testApiResponse.data.contentType.primary);
console.log('✅ voiceAnalysis.hasVoice:', testApiResponse.data.voiceAnalysis.hasVoice);
console.log('✅ basicInfo.speechiness:', testApiResponse.data.basicInfo.speechiness);
console.log('✅ voiceAnalysis data structure:', !!testApiResponse.data.voiceAnalysis);

console.log('\n🎯 Expected Frontend Behavior:');
console.log('===============================');
console.log('1. Smart Tab Selection:');
console.log('   - Should default to "voiceanalysis" tab');
console.log('   - Voice & Speech tab should be highlighted');

console.log('\n2. Voice Analysis Tab Content:');
console.log('   - Voice Detection: YES');
console.log('   - Speaker Count: 1');
console.log('   - Gender: Male (80% confidence)');
console.log('   - Primary Emotion: Neutral');
console.log('   - Speech Clarity: 90%');
console.log('   - Language: English');

console.log('\n3. UI Tab Order:');
console.log('   - Overview');
console.log('   - Voice & Speech (should be active)');
console.log('   - Sound Effects');
console.log('   - Emotions');
console.log('   - Structure');
console.log('   - Quality');

console.log('\n🔧 Debugging Steps:');
console.log('===================');
console.log('1. Check browser console for errors');
console.log('2. Verify voiceAnalysis data in React DevTools');
console.log('3. Check if VoiceAnalysisTab component renders');
console.log('4. Verify smart tab selection logic');

console.log('\n📝 Browser Console Commands to Test:');
console.log('====================================');
console.log('// Check if analysis result has voice data');
console.log('console.log("Voice Analysis:", window.lastAnalysisResult?.voiceAnalysis);');
console.log('');
console.log('// Check active tab state');
console.log('console.log("Active Tab:", document.querySelector(\'[data-active-tab]\')?.dataset.activeTab);');
console.log('');
console.log('// Check if Voice & Speech tab is visible');
console.log('console.log("Voice Tab:", document.querySelector(\'button:contains("Voice & Speech")\'));');

console.log('\n✅ If this data shows correctly, the fix should work!');
console.log('If Voice & Speech tab still doesn\'t show, check:');
console.log('- Component rendering conditions');
console.log('- TypeScript compilation errors');
console.log('- React state updates');

// Function to manually test smart tab selection
function testSmartTabSelection(result) {
    console.log('\n🧪 Testing Smart Tab Selection:');

    const getDefaultTab = () => {
        if (result?.voiceAnalysis?.hasVoice) return 'voiceanalysis';
        if (result?.soundEffects?.detected?.length > 0) return 'soundeffects';
        return 'overview';
    };

    const selectedTab = getDefaultTab();
    console.log('Selected tab should be:', selectedTab);

    return selectedTab;
}

// Export for browser testing
if (typeof window !== 'undefined') {
    window.testVoiceAnalysis = testApiResponse.data;
    window.testSmartTabSelection = testSmartTabSelection;
    console.log('\n🌐 Browser helpers available:');
    console.log('- window.testVoiceAnalysis (test data)');
    console.log('- window.testSmartTabSelection(result)');
}
