/**
 * Analyze页面的导出和分享功能
 * 从AnalyzeHeader.astro迁移而来，保持功能一致性
 */

// Store analysis result locally as backup
let localAnalysisResult: any = null;

// Also store in a different global property as backup
(window as any).backupAnalysisResult = null;

// Function to toggle export/share buttons visibility
function toggleExportShareButtons(show: boolean) {
    const container = document.getElementById("export-share-container");
    if (container) {
        if (show) {
            // Show buttons with proper responsive classes
            container.style.display = "";
            container.className = "hidden md:flex items-center gap-2";
            console.log("🔧 Export buttons shown");
        } else {
            // Hide buttons completely
            container.style.display = "none";
            container.className = "hidden items-center gap-2";
            console.log("🔧 Export buttons hidden");
        }
    }
}

// Function to check if we should show export buttons
// Show buttons when: (has analysis data) AND (on results page OR history sidebar is showing results)
function shouldShowExportButtons(): boolean {
    // Check if we have any analysis data available
    const hasAnalysisData = !!(
        (window as any).currentAnalysisResult ||
        (window as any).backupAnalysisResult ||
        localAnalysisResult
    );

    if (!hasAnalysisData) {
        return false;
    }

    // Check if we're currently showing analysis results
    // This could be either:
    // 1. Main analysis results page (DashboardSection is visible)
    // 2. History sidebar is open and showing a result
    const isDashboardVisible =
        document.querySelector('[data-component="dashboard"]') !== null;
    const isHistorySidebarOpen =
        document.querySelector('[data-sidebar="history"][data-state="open"]') !==
        null;
    const isHistoryItemSelected =
        document.querySelector('[data-history-item="selected"]') !== null;

    const shouldShow =
        isDashboardVisible || (isHistorySidebarOpen && isHistoryItemSelected);

    console.log("🔧 Export button check:", {
        hasAnalysisData,
        isDashboardVisible,
        isHistorySidebarOpen,
        isHistoryItemSelected,
        shouldShow,
    });

    return shouldShow;
}

// Listen for analysis result updates from React component
window.addEventListener("analysisResultReady", function (event: any) {
    console.log(
        "🔧 Analysis result ready event received for:",
        event.detail?.filename
    );

    // Store in multiple locations for reliability
    (window as any).currentAnalysisResult = event.detail;
    (window as any).backupAnalysisResult = event.detail;
    localAnalysisResult = event.detail;

    // Show export/share buttons when analysis is available
    toggleExportShareButtons(true);
});

// Listen for analysis result cleared event
window.addEventListener("analysisResultCleared", function () {
    console.log("🔧 Analysis result cleared event received");

    // Clear local storage
    localAnalysisResult = null;

    // Hide export/share buttons when no analysis is available
    toggleExportShareButtons(false);
});

// Track current visibility state to avoid unnecessary updates
let currentButtonsVisible = false;

// Check periodically if we should show/hide export buttons
setInterval(() => {
    const shouldShow = shouldShowExportButtons();
    if (shouldShow !== currentButtonsVisible) {
        console.log(
            "🔧 Button visibility changed from",
            currentButtonsVisible,
            "to",
            shouldShow
        );
        currentButtonsVisible = shouldShow;
        toggleExportShareButtons(shouldShow);
    }
}, 1000);

// Initial check on page load
setTimeout(() => {
    const shouldShow = shouldShowExportButtons();
    console.log("🔧 Initial check - should show buttons:", shouldShow);
    currentButtonsVisible = shouldShow;
    toggleExportShareButtons(shouldShow);
}, 500);

// Get current analysis data from React component state
function getCurrentAnalysisData() {
    // Try to get current analysis result from window object (set by React component)
    const currentResult = (window as any).currentAnalysisResult;

    // Debug logging with timestamp
    console.log(
        `🐛 Export Debug [${new Date().toISOString()}] - window.currentResult:`,
        currentResult
    );
    console.log(
        `🐛 Export Debug [${new Date().toISOString()}] - backupAnalysisResult:`,
        (window as any).backupAnalysisResult
    );
    console.log(
        `🐛 Export Debug [${new Date().toISOString()}] - localAnalysisResult:`,
        localAnalysisResult
    );
    console.log(
        `🐛 Export Debug [${new Date().toISOString()}] - filename:`,
        currentResult?.filename ||
        (window as any).backupAnalysisResult?.filename ||
        localAnalysisResult?.filename
    );

    // Use backups if primary global is null
    const result =
        currentResult ||
        (window as any).backupAnalysisResult ||
        localAnalysisResult;

    if (!result) {
        // Return placeholder data if no current analysis is available
        return {
            filename: "no-analysis-available.mp3",
            timestamp: new Date().toISOString(),
            duration: 0,
            format: "Unknown",
            basicInfo: {
                genre: "Unknown",
                mood: "Unknown",
                bpm: 0,
                key: "Unknown",
                energy: 0,
                valence: 0,
                danceability: 0,
            },
            emotions: {
                happy: 0,
                sad: 0,
                angry: 0,
                calm: 0,
                excited: 0,
            },
            quality: {
                overall: 0,
                clarity: 0,
                loudness: 0,
                dynamic_range: 0,
                noise_level: 0,
            },
            tags: ["no-analysis-available"],
        };
    }

    // Convert the React component data to export format
    return {
        filename: result.filename,
        timestamp: result.timestamp,
        duration: result.duration,
        fileSize: result.fileSize,
        format: result.format,
        contentType: result.contentType,
        basicInfo: {
            genre: result.basicInfo.genre,
            mood: result.basicInfo.mood,
            bpm: result.basicInfo.bpm,
            key: result.basicInfo.key,
            energy: result.basicInfo.energy,
            valence: result.basicInfo.valence,
            danceability: result.basicInfo.danceability,
            instrumentalness: result.basicInfo.instrumentalness,
            speechiness: result.basicInfo.speechiness,
            acousticness: result.basicInfo.acousticness,
            liveness: result.basicInfo.liveness,
            loudness: result.basicInfo.loudness,
        },
        voiceAnalysis: result.voiceAnalysis,
        soundEffects: result.soundEffects,
        emotions: result.emotions,
        structure: result.structure,
        quality: result.quality,
        similarity: result.similarity,
        tags: result.tags || [],
        aiDescription: result.aiDescription,
        processingTime: result.processingTime,
    };
}

// Helper function to get clean filename without extension
function getCleanFilename(filename: string) {
    if (!filename || filename === "no-analysis-available.mp3") {
        return "audio-analysis";
    }

    // Remove file extension
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex > 0) {
        return filename.substring(0, lastDotIndex);
    }
    return filename;
}

// Export functions
function exportAsJSON() {
    const data = getCurrentAnalysisData();
    const cleanFilename = getCleanFilename(data.filename);
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(
        `${cleanFilename}-analysis.json`,
        jsonString,
        "application/json"
    );
}

function exportAsCSV() {
    const data = getCurrentAnalysisData();
    const cleanFilename = getCleanFilename(data.filename);
    const csv = convertToCSV(data);
    downloadFile(`${cleanFilename}-analysis.csv`, csv, "text/csv");
}

function exportReport() {
    const data = getCurrentAnalysisData();
    const cleanFilename = getCleanFilename(data.filename);
    const report = generateTextReport(data);
    downloadFile(`${cleanFilename}-report.txt`, report, "text/plain");
}

function copyAnalysisData() {
    const data = getCurrentAnalysisData();
    const summary = generateSummary(data);
    navigator.clipboard.writeText(summary).then(() => {
        showNotification("Analysis data copied to clipboard!");
    });
}

// Share functions
function copyShareLink() {
    const data = getCurrentAnalysisData();
    if (!data || !data.id) {
        showNotification("No analysis result available to share");
        return;
    }
    // Use the correct route with analysis ID (ensure trailing slash)
    const shareUrl = `${window.location.origin}/analysis/${data.id}/`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification("Share link copied to clipboard!");
    });
}

function shareViaEmail() {
    const data = getCurrentAnalysisData();
    const cleanFilename = getCleanFilename(data.filename);
    const subject = `Audio Analysis Results: ${cleanFilename}`;
    const body = generateEmailBody(data);
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
}

function shareToTwitter() {
    const data = getCurrentAnalysisData();
    if (!data || !data.id) {
        showNotification("No analysis result available to share");
        return;
    }
    const cleanFilename = getCleanFilename(data.filename);
    const shareUrl = `${window.location.origin}/analysis/${data.id}/`;
    
    // 生成更有吸引力的 Twitter 文案
    // Twitter 会自动在推文末尾添加链接，所以文案中不需要包含链接提示
    let text = `🎵 Just analyzed "${cleanFilename}" with AI-powered audio analysis!\n\n`;
    text += `🎯 ${data.basicInfo?.genre || 'Music'} • ${data.basicInfo?.bpm || 'N/A'} BPM • ${data.basicInfo?.mood || 'Unknown'} mood`;
    if (data.quality?.overall) {
        text += ` • ⭐ ${data.quality.overall}/10`;
    }
    text += `\n\n`;
    text += `#AudioAnalysis #AIMusic #MusicTech #DescribeMusic`;
    
    // Twitter 字符限制是 280，链接会占用约 23 字符，所以文案限制在 250 字符内
    const maxLength = 250;
    if (text.length > maxLength) {
        // 简化版本：只保留核心信息
        text = `🎵 Just analyzed "${cleanFilename}" with AI!\n\n`;
        text += `🎯 ${data.basicInfo?.genre || 'Music'} • ${data.basicInfo?.bpm || 'N/A'} BPM • ${data.basicInfo?.mood || 'Unknown'}\n\n`;
        text += `#AudioAnalysis #AIMusic #MusicTech`;
    }
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
}

function shareToLinkedIn() {
    const data = getCurrentAnalysisData();
    const cleanFilename = getCleanFilename(data.filename);
    const summary = `Just completed an AI-powered audio analysis of "${cleanFilename}" using Describe Music. Key insights: ${data.basicInfo.genre} genre, ${data.basicInfo.bpm} BPM, ${data.basicInfo.mood} mood.`;
    // Ensure URL ends with trailing slash
    const shareUrl = window.location.href.endsWith('/') ? window.location.href : `${window.location.href}/`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(summary)}`;
    window.open(url, "_blank");
}

// Utility functions
function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`${filename} downloaded successfully!`);
}

function convertToCSV(data: any) {
    const rows = [
        ["Category", "Property", "Value", "Notes"],

        // File Information
        ["File Info", "Filename", data.filename, "Original audio file"],
        [
            "File Info",
            "Analysis Date",
            new Date(data.timestamp).toLocaleString(),
            "When analysis was performed",
        ],
        [
            "File Info",
            "Duration",
            `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, "0")}`,
            "Audio length in MM:SS",
        ],
        [
            "File Info",
            "File Size",
            data.fileSize || "Unknown",
            "Size of audio file",
        ],
        ["File Info", "Format", data.format || "Unknown", "Audio file format"],
        [
            "File Info",
            "Processing Time",
            `${data.processingTime || 0} seconds`,
            "AI analysis processing time",
        ],

        // Basic Musical Analysis
        [
            "Music Analysis",
            "Genre",
            data.basicInfo?.genre || "Unknown",
            "Primary musical genre",
        ],
        [
            "Music Analysis",
            "Mood",
            data.basicInfo?.mood || "Unknown",
            "Overall emotional mood",
        ],
        [
            "Music Analysis",
            "BPM",
            data.basicInfo?.bpm || "Unknown",
            "Beats per minute (tempo)",
        ],
        [
            "Music Analysis",
            "Key",
            data.basicInfo?.key || "Unknown",
            "Musical key signature",
        ],
        [
            "Music Analysis",
            "Energy",
            Math.round((data.basicInfo?.energy || 0) * 100) + "%",
            "Energy level (0-100%)",
        ],
        [
            "Music Analysis",
            "Valence",
            Math.round((data.basicInfo?.valence || 0) * 100) + "%",
            "Musical positivity (0-100%)",
        ],
        [
            "Music Analysis",
            "Danceability",
            Math.round((data.basicInfo?.danceability || 0) * 100) + "%",
            "How suitable for dancing (0-100%)",
        ],
    ];

    // Add Emotional Analysis if available
    if (data.emotions) {
        Object.entries(data.emotions).forEach(([emotion, value]) => {
            rows.push([
                "Emotions",
                emotion.charAt(0).toUpperCase() + emotion.slice(1),
                Math.round((value as number) * 100) + "%",
                `${emotion} emotion intensity`,
            ]);
        });
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
}

function generateTextReport(data: any) {
    const cleanFilename = getCleanFilename(data.filename);

    return `
AUDIO ANALYSIS REPORT
=====================

File Information:
- Filename: ${data.filename}
- Analysis Date: ${new Date(data.timestamp).toLocaleString()}
- Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, "0")}
- Format: ${data.format || "Unknown"}

Musical Analysis:
- Genre: ${data.basicInfo?.genre || "Unknown"}
- Mood: ${data.basicInfo?.mood || "Unknown"}
- BPM: ${data.basicInfo?.bpm || "Unknown"}
- Key: ${data.basicInfo?.key || "Unknown"}
- Energy: ${Math.round((data.basicInfo?.energy || 0) * 100)}%
- Valence: ${Math.round((data.basicInfo?.valence || 0) * 100)}%
- Danceability: ${Math.round((data.basicInfo?.danceability || 0) * 100)}%

Audio Quality:
- Overall Score: ${data.quality?.overall || 0}/10
- Clarity: ${data.quality?.clarity || 0}/10
- Loudness: ${data.quality?.loudness || 0} dB

AI Description:
${data.aiDescription || "No description available"}

Generated by Describe Music - AI-Powered Audio Analysis
  `.trim();
}

function generateSummary(data: any) {
    const cleanFilename = data.filename?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'audio_file';
    
    let summary = `🎵 Audio Analysis Summary for: ${data.filename || 'Unknown'}

📊 Basic Info: ${data.basicInfo?.genre || "Unknown"} | ${data.basicInfo?.mood || "Unknown"} | ${data.basicInfo?.bpm || "Unknown"} BPM | ${data.basicInfo?.key || "Unknown"}

⚡ Key Metrics:
• Energy: ${Math.round((data.basicInfo?.energy || 0) * 100)}%
• Danceability: ${Math.round((data.basicInfo?.danceability || 0) * 100)}%
• Valence: ${Math.round((data.basicInfo?.valence || 0) * 100)}%
• Quality Score: ${data.quality?.overall || 0}/10

📁 File Info: ${data.format || "Unknown"} | ${data.fileSize || "Unknown"} | ${Math.floor((data.duration || 0) / 60)}:${Math.floor((data.duration || 0) % 60).toString().padStart(2, "0")}`;

    if (data.contentType) {
        summary += `\n\n🎯 Content Type: ${data.contentType.primary} (${Math.round((data.contentType.confidence || 0) * 100)}% confidence)`;
        if (data.contentType.description) {
            summary += `\n   ${data.contentType.description}`;
        }
    }

    if (data.voiceAnalysis && data.voiceAnalysis.hasVoice) {
        summary += `\n\n🎙️ Voice Analysis:`;
        summary += `\n• Speakers: ${data.voiceAnalysis.speakerCount || 0}`;
        if (data.voiceAnalysis.genderDetection) {
            summary += `\n• Gender: ${data.voiceAnalysis.genderDetection.primary || "Unknown"} (${Math.round((data.voiceAnalysis.genderDetection.confidence || 0) * 100)}%)`;
        }
        if (data.voiceAnalysis.speakerEmotion) {
            summary += `\n• Emotion: ${data.voiceAnalysis.speakerEmotion.primary || "Unknown"} (${Math.round((data.voiceAnalysis.speakerEmotion.confidence || 0) * 100)}%)`;
        }
        if (data.voiceAnalysis.speechClarity) {
            summary += `\n• Speech Clarity: ${Math.round((data.voiceAnalysis.speechClarity.score || 0) * 10)}/10`;
            summary += ` | Pace: ${data.voiceAnalysis.speechClarity.pace || "normal"}`;
            summary += ` | Volume: ${data.voiceAnalysis.speechClarity.volume || "normal"}`;
        }
        if (data.voiceAnalysis.languageAnalysis) {
            summary += `\n• Language: ${data.voiceAnalysis.languageAnalysis.language || "Unknown"} (${Math.round((data.voiceAnalysis.languageAnalysis.confidence || 0) * 100)}%)`;
            if (data.voiceAnalysis.languageAnalysis.accent) {
                summary += ` | Accent: ${data.voiceAnalysis.languageAnalysis.accent}`;
            }
        }
    }

    if (data.soundEffects && data.soundEffects.detected && data.soundEffects.detected.length > 0) {
        summary += `\n\n🔊 Sound Effects: ${data.soundEffects.detected.length} detected`;
        data.soundEffects.detected.slice(0, 5).forEach((effect: any, index: number) => {
            const startTime = Math.floor(effect.timestamp?.start || 0);
            const endTime = Math.floor(effect.timestamp?.end || 0);
            summary += `\n• ${index + 1}. ${effect.type || "Unknown"} (${effect.category || "Unknown"}) - ${Math.round((effect.confidence || 0) * 100)}%`;
            if (startTime > 0 || endTime > 0) {
                summary += ` [${Math.floor(startTime / 60)}:${Math.floor(startTime % 60).toString().padStart(2, "0")} - ${Math.floor(endTime / 60)}:${Math.floor(endTime % 60).toString().padStart(2, "0")}]`;
            }
            if (effect.description) {
                summary += `\n  ${effect.description}`;
            }
        });
        if (data.soundEffects.detected.length > 5) {
            summary += `\n  ... and ${data.soundEffects.detected.length - 5} more`;
        }
    }

    if (data.emotions) {
        const sortedEmotions = Object.entries(data.emotions)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .filter(([, value]) => (value as number) > 0);

        if (sortedEmotions.length > 0) {
            summary += `\n\n🎭 Emotions:`;
            sortedEmotions.forEach(([emotion, value]) => {
                summary += `\n• ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${Math.round((value as number) * 100)}%`;
            });
        }
    }

    if (data.transcription && data.transcription.trim() && !data.transcription.toLowerCase().includes('no speech detected')) {
        summary += `\n\n📝 Transcription:`;
        const transcription = data.transcription.trim();
        if (transcription.length > 500) {
            summary += `\n${transcription.substring(0, 500)}...`;
            summary += `\n\n[Transcription truncated - ${transcription.length} characters total]`;
        } else {
            summary += `\n${transcription}`;
        }
    }

    if (data.similarity) {
        if (data.similarity.similar_tracks && data.similarity.similar_tracks.length > 0) {
            summary += `\n\n🎼 Similar Tracks:`;
            data.similarity.similar_tracks.slice(0, 3).forEach((track: any, index: number) => {
                summary += `\n• ${index + 1}. ${track.title || "Unknown"} by ${track.artist || "Unknown"}`;
                if (track.similarity) {
                    summary += ` (${Math.round(track.similarity * 100)}% similar)`;
                }
            });
        }
    }

    if (data.tags && data.tags.length > 0) {
        summary += `\n\n🏷️ AI Tags: ${data.tags.map((tag: string) => `#${tag}`).join(" ")}`;
    }

    if (data.aiDescription) {
        summary += `\n\n🤖 AI Description:\n${data.aiDescription}`;
    }

    if (data.quality) {
        summary += `\n\n⭐ Quality Details:`;
        if (data.quality.clarity !== undefined) {
            summary += `\n• Clarity: ${data.quality.clarity}/10`;
        }
        if (data.quality.loudness !== undefined) {
            summary += `\n• Loudness: ${data.quality.loudness}/10`;
        }
    }

    summary += `\n\n✨ Analyzed by Describe Music - AI-Powered Audio Analysis`;

    return summary;
}

function generateEmailBody(data: any) {
    const cleanFilename = getCleanFilename(data.filename);

    return `Hi there!

I just completed an AI-powered audio analysis using Describe Music and wanted to share the results with you.

File: ${data.filename}
Analysis completed: ${new Date(data.timestamp).toLocaleString()}

Key Insights:
• Genre: ${data.basicInfo?.genre || "Unknown"}
• Mood: ${data.basicInfo?.mood || "Unknown"}
• BPM: ${data.basicInfo?.bpm || "Unknown"}
• Key: ${data.basicInfo?.key || "Unknown"}
• Energy Level: ${Math.round((data.basicInfo?.energy || 0) * 100)}%
• Audio Quality: ${data.quality?.overall || 0}/10

${data.aiDescription ? `AI Description: ${data.aiDescription}` : ''}

Try Describe Music for your own audio analysis: ${window.location.origin}

Best regards!`;
}

function showNotification(message: string) {
    // Simple notification - you can enhance this with a proper notification system
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions globally accessible
(window as any).exportAsJSON = exportAsJSON;
(window as any).exportAsCSV = exportAsCSV;
(window as any).exportReport = exportReport;
(window as any).copyAnalysisData = copyAnalysisData;
(window as any).copyShareLink = copyShareLink;
(window as any).shareViaEmail = shareViaEmail;
(window as any).shareToTwitter = shareToTwitter;
(window as any).shareToLinkedIn = shareToLinkedIn;