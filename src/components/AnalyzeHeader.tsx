import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCredit } from '../contexts/CreditContext';
import { useCreditToast } from './credit/CreditToast';
import UserAccountDropdown from './UserAccountDropdown';


export default function AnalyzeHeader() {
    const { user, signOut, usageStatus } = useAuth();
    const toast = useCreditToast();

    // Safely use credit context with error handling
    let credits = 0;
    let creditLoading = false;

    try {
        const creditContext = useCredit();
        credits = creditContext.credits;
        creditLoading = creditContext.loading;
    } catch (error) {
        console.warn('Credit context not available in AnalyzeHeader component:', error);
    }


    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExportButtons, setShowExportButtons] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Listen for analysis result events to show/hide export buttons
    useEffect(() => {
        const handleAnalysisReady = () => {
            console.log('🎯 AnalyzeHeader: analysisResultReady event received');
            setShowExportButtons(true);
        };
        const handleAnalysisCleared = () => {
            console.log('🎯 AnalyzeHeader: analysisResultCleared event received');
            setShowExportButtons(false);
        };

        // Check if analysis result already exists when component mounts
        const checkExistingResult = () => {
            const hasResult = !!(window as any).currentAnalysisResult || !!(window as any).backupAnalysisResult;
            console.log('🎯 AnalyzeHeader: Checking for existing result on mount:', hasResult);
            if (hasResult) {
                console.log('🎯 AnalyzeHeader: Found existing result, showing export buttons');
                setShowExportButtons(true);
            }
        };

        window.addEventListener('analysisResultReady', handleAnalysisReady);
        window.addEventListener('analysisResultCleared', handleAnalysisCleared);
        
        console.log('🎯 AnalyzeHeader: Event listeners registered');
        
        // Check for existing result after a short delay to ensure AnalysisResultViewer has set it
        setTimeout(checkExistingResult, 100);

        return () => {
            window.removeEventListener('analysisResultReady', handleAnalysisReady);
            window.removeEventListener('analysisResultCleared', handleAnalysisCleared);
        };
    }, []);

    const handleSignOut = async () => {
        try {
            console.log('Starting sign out process...');
            await signOut();
            console.log('Sign out successful');
            setShowUserMenu(false);

            // 重定向到首页
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
        }
    };

    // Export functionality
    const getCurrentAnalysisData = () => {
        const currentResult = (window as any).currentAnalysisResult;
        const result = currentResult || (window as any).backupAnalysisResult;

        if (!result) {
            return {
                filename: "no-analysis-available.mp3",
                timestamp: new Date().toISOString(),
                duration: 0,
                format: "Unknown",
                basicInfo: { genre: "Unknown", mood: "Unknown", bpm: 0 },
                emotions: { happy: 0, sad: 0, angry: 0, calm: 0, excited: 0 },
                quality: { overall: 0, clarity: 0 },
                tags: ["no-analysis-available"],
            };
        }

        return result;
    };

    const downloadFile = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCleanFilename = (filename: string) => {
        if (!filename || filename === "no-analysis-available.mp3") {
            return "audio-analysis";
        }
        const lastDotIndex = filename.lastIndexOf(".");
        if (lastDotIndex > 0) {
            return filename.substring(0, lastDotIndex);
        }
        return filename;
    };

    const exportAsJSON = () => {
        const data = getCurrentAnalysisData();
        const cleanFilename = getCleanFilename(data.filename);
        const jsonString = JSON.stringify(data, null, 2);
        downloadFile(`${cleanFilename}-analysis.json`, jsonString, "application/json");
        setShowExportMenu(false);
    };

    const exportAsCSV = () => {
        const data = getCurrentAnalysisData();
        if (!data) {
            toast.error('Error', 'No analysis data available');
            return;
        }

        // Use the same convertToCSV function from AnalyzeHeader.astro if available
        let csvContent: string;
        if ((window as any).convertToCSV) {
            csvContent = (window as any).convertToCSV(data);
        } else {
            // Fallback: generate CSV inline
            csvContent = convertToCSVInline(data);
        }

        const cleanFilename = getCleanFilename(data.filename);
        downloadFile(`${cleanFilename}-analysis.csv`, csvContent, "text/csv");
        setShowExportMenu(false);
    };

    // Inline CSV conversion as fallback
    const convertToCSVInline = (data: any): string => {
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        };

        const escapeCSV = (value: any): string => {
            if (value === null || value === undefined) return "";
            const str = String(value);
            // Escape quotes and wrap in quotes if contains comma, newline, or quote
            if (str.includes(",") || str.includes("\n") || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows: string[][] = [
            ["Category", "Property", "Value", "Notes"],
            
            // File Information
            ["File Info", "Filename", data.filename || "Unknown", "Original audio file"],
            ["File Info", "Analysis Date", new Date(data.timestamp || Date.now()).toLocaleString(), "When analysis was performed"],
            ["File Info", "Duration", formatTime(data.duration || 0), "Audio length in MM:SS"],
            ["File Info", "File Size", data.fileSize || "Unknown", "Size of audio file"],
            ["File Info", "Format", data.format || "Unknown", "Audio file format"],
            ["File Info", "Processing Time", `${data.processingTime || 0} seconds`, "AI analysis processing time"],
            
            // Basic Musical Analysis
            ["Music Analysis", "Genre", data.basicInfo?.genre || "Unknown", "Primary musical genre"],
            ["Music Analysis", "Mood", data.basicInfo?.mood || "Unknown", "Overall emotional mood"],
            ["Music Analysis", "BPM", String(data.basicInfo?.bpm || "Unknown"), "Beats per minute (tempo)"],
            ["Music Analysis", "Key", data.basicInfo?.key || "Unknown", "Musical key signature"],
            ["Music Analysis", "Energy", `${Math.round((data.basicInfo?.energy || 0) * 100)}%`, "Energy level (0-100%)"],
            ["Music Analysis", "Valence", `${Math.round((data.basicInfo?.valence || 0) * 100)}%`, "Musical positivity (0-100%)"],
            ["Music Analysis", "Danceability", `${Math.round((data.basicInfo?.danceability || 0) * 100)}%`, "How suitable for dancing (0-100%)"],
            ["Music Analysis", "Instrumentalness", `${Math.round((data.basicInfo?.instrumentalness || 0) * 100)}%`, "Lack of vocals (0-100%)"],
            ["Music Analysis", "Speechiness", `${Math.round((data.basicInfo?.speechiness || 0) * 100)}%`, "Presence of spoken words (0-100%)"],
            ["Music Analysis", "Acousticness", `${Math.round((data.basicInfo?.acousticness || 0) * 100)}%`, "Acoustic vs electronic (0-100%)"],
            ["Music Analysis", "Liveness", `${Math.round((data.basicInfo?.liveness || 0) * 100)}%`, "Live performance detection (0-100%)"],
            
            // Audio Quality
            ["Audio Quality", "Overall Score", `${data.quality?.overall || 0}/10`, "Overall audio quality rating"],
            ["Audio Quality", "Clarity", `${data.quality?.clarity || 0}/10`, "Audio clarity and definition"],
            ["Audio Quality", "Loudness", `${data.quality?.loudness || 0} dB`, "RMS loudness level"],
            ["Audio Quality", "Dynamic Range", `${data.quality?.dynamic_range || 0}/10`, "Difference between loud and quiet parts"],
            ["Audio Quality", "Noise Level", `${data.quality?.noise_level || 0}%`, "Background noise percentage"],
        ];

        // Add Emotional Analysis
        if (data.emotions) {
            Object.entries(data.emotions).forEach(([emotion, value]) => {
                rows.push([
                    "Emotions",
                    emotion.charAt(0).toUpperCase() + emotion.slice(1),
                    `${Math.round((value as number) * 100)}%`,
                    `${emotion} emotion intensity`,
                ]);
            });
        }

        // Add Content Type
        if (data.contentType) {
            rows.push(["Content Type", "Primary Type", data.contentType.primary || "Unknown", "Main content classification"]);
            rows.push(["Content Type", "Confidence", `${Math.round((data.contentType.confidence || 0) * 100)}%`, "Classification confidence"]);
            if (data.contentType.description) {
                rows.push(["Content Type", "Description", data.contentType.description, "Detailed content description"]);
            }
        }

        // Add Voice Analysis
        if (data.voiceAnalysis && data.voiceAnalysis.hasVoice) {
            rows.push(["Voice Analysis", "Has Voice", "Yes", "Voice detection result"]);
            rows.push(["Voice Analysis", "Speaker Count", String(data.voiceAnalysis.speakerCount || 0), "Number of detected speakers"]);
            
            if (data.voiceAnalysis.genderDetection) {
                rows.push(["Voice Analysis", "Primary Gender", data.voiceAnalysis.genderDetection.primary || "Unknown", "Detected speaker gender"]);
                rows.push(["Voice Analysis", "Gender Confidence", `${Math.round((data.voiceAnalysis.genderDetection.confidence || 0) * 100)}%`, "Gender detection confidence"]);
            }
            
            if (data.voiceAnalysis.speakerEmotion) {
                rows.push(["Voice Analysis", "Speaker Emotion", data.voiceAnalysis.speakerEmotion.primary || "Unknown", "Primary emotional tone"]);
                rows.push(["Voice Analysis", "Emotion Confidence", `${Math.round((data.voiceAnalysis.speakerEmotion.confidence || 0) * 100)}%`, "Emotion detection confidence"]);
            }
            
            if (data.voiceAnalysis.speechClarity) {
                rows.push(["Voice Analysis", "Speech Clarity", `${data.voiceAnalysis.speechClarity.score || 0}/10`, "Overall speech clarity score"]);
                rows.push(["Voice Analysis", "Speaking Pace", data.voiceAnalysis.speechClarity.pace || "Unknown", "Speaking speed assessment"]);
                rows.push(["Voice Analysis", "Volume Level", data.voiceAnalysis.speechClarity.volume || "Unknown", "Voice volume level"]);
            }
            
            if (data.voiceAnalysis.languageAnalysis) {
                rows.push(["Voice Analysis", "Language", data.voiceAnalysis.languageAnalysis.language || "Unknown", "Detected language"]);
                rows.push(["Voice Analysis", "Language Confidence", `${Math.round((data.voiceAnalysis.languageAnalysis.confidence || 0) * 100)}%`, "Language detection confidence"]);
                if (data.voiceAnalysis.languageAnalysis.accent) {
                    rows.push(["Voice Analysis", "Accent", data.voiceAnalysis.languageAnalysis.accent, "Detected accent"]);
                }
            }
        }

        // Add Sound Effects
        if (data.soundEffects && data.soundEffects.detected && data.soundEffects.detected.length > 0) {
            data.soundEffects.detected.forEach((sound: any, index: number) => {
                rows.push(["Sound Effects", `Effect ${index + 1} - Type`, sound.type || "Unknown", "Detected sound effect type"]);
                rows.push(["Sound Effects", `Effect ${index + 1} - Category`, sound.category || "Unknown", "Sound category classification"]);
                rows.push(["Sound Effects", `Effect ${index + 1} - Confidence`, `${Math.round((sound.confidence || 0) * 100)}%`, "Detection confidence"]);
                rows.push(["Sound Effects", `Effect ${index + 1} - Time`, `${formatTime(sound.timestamp?.start || 0)} - ${formatTime(sound.timestamp?.end || 0)}`, "When this sound occurs"]);
                if (sound.description) {
                    rows.push(["Sound Effects", `Effect ${index + 1} - Description`, sound.description, "Detailed description"]);
                }
            });
            
            if (data.soundEffects.environment) {
                const env = data.soundEffects.environment;
                rows.push(["Environment", "Location Type", env.location_type || "Unknown", "Indoor/outdoor classification"]);
                rows.push(["Environment", "Setting", env.setting || "Unknown", "Environment setting type"]);
                rows.push(["Environment", "Activity Level", env.activity_level || "Unknown", "Level of activity/busyness"]);
                rows.push(["Environment", "Acoustic Space", env.acoustic_space || "Unknown", "Size of acoustic space"]);
                rows.push(["Environment", "Time of Day", env.time_of_day || "Unknown", "Estimated time period"]);
                rows.push(["Environment", "Weather", env.weather || "Unknown", "Weather conditions if detectable"]);
            }
        }

        // Add Similar Tracks
        if (data.similarity && data.similarity.similar_tracks && data.similarity.similar_tracks.length > 0) {
            data.similarity.similar_tracks.forEach((track: any, index: number) => {
                rows.push([
                    "Similar Music",
                    `Similar Track ${index + 1}`,
                    `${track.artist || "Unknown"} - ${track.title || "Unknown"}`,
                    `${Math.round((track.similarity || 0) * 100)}% similarity`,
                ]);
            });
            rows.push(["Similar Music", "Genre Confidence", `${Math.round((data.similarity.genre_confidence || 0) * 100)}%`, "Confidence in genre classification"]);
        }

        // Add Style Influences
        if (data.similarity && data.similarity.style_influences && data.similarity.style_influences.length > 0) {
            rows.push(["Similar Music", "Style Influences", data.similarity.style_influences.join(", "), "Musical styles that influenced this track"]);
        }

        // Add AI Tags
        if (data.tags && data.tags.length > 0) {
            rows.push(["AI Tags", "All Tags", data.tags.map((tag: string) => `#${tag}`).join(", "), `${data.tags.length} auto-generated tags for SEO and categorization`]);
        }

        // Add Transcription
        if (data.transcription && data.transcription.trim() && !data.transcription.toLowerCase().includes('no speech detected')) {
            const transcription = data.transcription.trim();
            rows.push(["Transcription", "Full Text", transcription, "Complete audio-to-text transcription"]);
            rows.push(["Transcription", "Character Count", String(transcription.length), "Total characters in transcription"]);
        }

        // Add AI Description
        if (data.aiDescription) {
            rows.push(["AI Analysis", "Description", data.aiDescription, "AI-generated description of the audio"]);
        }

        return rows.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
    };

    const copyAnalysisData = async () => {
        const data = getCurrentAnalysisData();
        if (!data) {
            toast.error('Error', 'No analysis data available');
            return;
        }

        // Use the same generateSummary function from AnalyzeHeader.astro
        // If it's available globally, use it; otherwise generate inline
        let summary: string;
        if ((window as any).generateSummary) {
            summary = (window as any).generateSummary(data);
        } else {
            // Fallback: generate summary inline
            summary = generateSummaryInline(data);
        }

        try {
            await navigator.clipboard.writeText(summary);
            toast.success('Copied!', 'Analysis data copied to clipboard');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast.error('Error', 'Failed to copy to clipboard');
        }
        setShowExportMenu(false);
    };

    // Inline summary generation as fallback
    const generateSummaryInline = (data: any): string => {
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
    };

    const copyShareLink = async () => {
        try {
            // Ensure URL ends with trailing slash
            const shareUrl = window.location.href.endsWith('/') 
                ? window.location.href 
                : `${window.location.href}/`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link Copied!', 'Share link copied to clipboard');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast.error('Error', 'Failed to copy to clipboard');
        }
    };

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 border-b border-slate-800/50">
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"></div>

                <div className="relative max-w-none px-3 sm:px-6">
                    <div className="h-16 flex items-center justify-between gap-2">
                        {/* Brand Logo */}
                        <a href="/" className="group relative flex-shrink-0">
                            <div className="text-base sm:text-xl font-bold tracking-tight">
                                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Describe
                                </span>
                                <span className="text-white/70 group-hover:text-white/90 transition-colors duration-300">
                                    Music
                                </span>
                                <span className="text-violet-400/80">.</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                        </a>

                        {/* Right side navigation */}
                        <nav className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 justify-end">
                            {/* Export/Share buttons - only show when analysis is available */}
                            {showExportButtons && (
                                <div className="hidden md:flex items-center gap-2">
                                    {/* Export Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-md hover:border-slate-600 transition-all duration-300"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Export Dropdown Menu */}
                                        {showExportMenu && (
                                            <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                                                <div className="p-2">
                                                    <button
                                                        onClick={exportAsJSON}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Export as JSON
                                                    </button>
                                                    <button
                                                        onClick={exportAsCSV}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Export as CSV
                                                    </button>
                                                    <hr className="my-2 border-slate-600" />
                                                    <button
                                                        onClick={copyAnalysisData}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Copy to Clipboard
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* User Authentication Section */}
                            <UserAccountDropdown />

                            {/* Mobile menu button */}
                            <button 
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="md:hidden p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all duration-300 flex-shrink-0"
                            >
                                {showMobileMenu ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 z-40 top-16">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowMobileMenu(false)}
                    />
                    
                    {/* Menu Panel */}
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
                        <nav className="px-4 py-4">
                            <ul className="space-y-1">
                                <li>
                                    <a
                                        href="/#features"
                                        className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/pricing"
                                        className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Pricing
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/blog"
                                        className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/about"
                                        className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/contact"
                                        className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Contact
                                    </a>
                                </li>
                                
                                {/* Export/Share actions for mobile */}
                                {showExportButtons && (
                                    <>
                                        <li className="pt-3 mt-3 border-t border-slate-700">
                                            <button
                                                onClick={() => {
                                                    exportAsJSON();
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Export as JSON
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={() => {
                                                    exportAsCSV();
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Export as CSV
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={() => {
                                                    copyShareLink();
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                                Copy Share Link
                                            </button>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </nav>
                    </div>
                </div>
            )}

            {/* Click outside to close menus */}
            {(showUserMenu || showExportMenu) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowUserMenu(false);
                        setShowExportMenu(false);
                    }}
                />
            )}
        </>
    );
}