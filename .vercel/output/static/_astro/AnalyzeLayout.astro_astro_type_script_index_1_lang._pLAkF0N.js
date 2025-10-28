let a=null;window.backupAnalysisResult=null;function r(n){const e=document.getElementById("export-share-container");e&&(n?(e.style.display="",e.className="hidden md:flex items-center gap-2"):(e.style.display="none",e.className="hidden items-center gap-2"))}function y(){if(!!!(window.currentAnalysisResult||window.backupAnalysisResult||a))return!1;const e=document.querySelector('[data-component="dashboard"]')!==null,o=document.querySelector('[data-sidebar="history"][data-state="open"]')!==null,i=document.querySelector('[data-history-item="selected"]')!==null;return e||o&&i}window.addEventListener("analysisResultReady",function(n){n.detail?.filename,window.currentAnalysisResult=n.detail,window.backupAnalysisResult=n.detail,a=n.detail,r(!0)});window.addEventListener("analysisResultCleared",function(){a=null,r(!1)});let u=!1;setInterval(()=>{const n=y();n!==u&&(u=n,r(n))},1e3);setTimeout(()=>{const n=y();u=n,r(n)},500);function t(){const n=window.currentAnalysisResult;`${new Date().toISOString()}`,`${new Date().toISOString()}`,window.backupAnalysisResult,`${new Date().toISOString()}`,`${new Date().toISOString()}`,n?.filename||window.backupAnalysisResult?.filename||a?.filename;const e=n||window.backupAnalysisResult||a;return e?{filename:e.filename,timestamp:e.timestamp,duration:e.duration,fileSize:e.fileSize,format:e.format,contentType:e.contentType,basicInfo:{genre:e.basicInfo.genre,mood:e.basicInfo.mood,bpm:e.basicInfo.bpm,key:e.basicInfo.key,energy:e.basicInfo.energy,valence:e.basicInfo.valence,danceability:e.basicInfo.danceability,instrumentalness:e.basicInfo.instrumentalness,speechiness:e.basicInfo.speechiness,acousticness:e.basicInfo.acousticness,liveness:e.basicInfo.liveness,loudness:e.basicInfo.loudness},voiceAnalysis:e.voiceAnalysis,soundEffects:e.soundEffects,emotions:e.emotions,structure:e.structure,quality:e.quality,similarity:e.similarity,tags:e.tags||[],aiDescription:e.aiDescription,processingTime:e.processingTime}:{filename:"no-analysis-available.mp3",timestamp:new Date().toISOString(),duration:0,format:"Unknown",basicInfo:{genre:"Unknown",mood:"Unknown",bpm:0,key:"Unknown",energy:0,valence:0,danceability:0},emotions:{happy:0,sad:0,angry:0,calm:0,excited:0},quality:{overall:0,clarity:0,loudness:0,dynamic_range:0,noise_level:0},tags:["no-analysis-available"]}}function s(n){if(!n||n==="no-analysis-available.mp3")return"audio-analysis";const e=n.lastIndexOf(".");return e>0?n.substring(0,e):n}function f(){const n=t(),e=s(n.filename),o=JSON.stringify(n,null,2);d(`${e}-analysis.json`,o,"application/json")}function p(){const n=t(),e=s(n.filename),o=A(n);d(`${e}-analysis.csv`,o,"text/csv")}function w(){const n=t(),e=s(n.filename),o=S(n);d(`${e}-report.txt`,o,"text/plain")}function b(){const n=t(),e=k(n);navigator.clipboard.writeText(e).then(()=>{m("Analysis data copied to clipboard!")})}function g(){const n=t(),e=s(n.filename),o=`${window.location.origin}/results/${e}-${Date.now()}`;navigator.clipboard.writeText(o).then(()=>{m("Share link copied to clipboard!")})}function I(){const n=t(),o=`Audio Analysis Results: ${s(n.filename)}`,i=D(n),l=`mailto:?subject=${encodeURIComponent(o)}&body=${encodeURIComponent(i)}`;window.open(l)}function h(){const n=t(),o=`Just analyzed "${s(n.filename)}" with Describe Music! 🎵 Genre: ${n.basicInfo.genre}, BPM: ${n.basicInfo.bpm}, Mood: ${n.basicInfo.mood} ⚡ #AudioAnalysis #AI`,i=`https://twitter.com/intent/tweet?text=${encodeURIComponent(o)}`;window.open(i,"_blank")}function $(){const n=t(),o=`Just completed an AI-powered audio analysis of "${s(n.filename)}" using Describe Music. Key insights: ${n.basicInfo.genre} genre, ${n.basicInfo.bpm} BPM, ${n.basicInfo.mood} mood.`,i=`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(o)}`;window.open(i,"_blank")}function d(n,e,o){const i=new Blob([e],{type:o}),l=URL.createObjectURL(i),c=document.createElement("a");c.href=l,c.download=n,document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(l),m(`${n} downloaded successfully!`)}function A(n){const e=[["Category","Property","Value","Notes"],["File Info","Filename",n.filename,"Original audio file"],["File Info","Analysis Date",new Date(n.timestamp).toLocaleString(),"When analysis was performed"],["File Info","Duration",`${Math.floor(n.duration/60)}:${(n.duration%60).toString().padStart(2,"0")}`,"Audio length in MM:SS"],["File Info","File Size",n.fileSize||"Unknown","Size of audio file"],["File Info","Format",n.format||"Unknown","Audio file format"],["File Info","Processing Time",`${n.processingTime||0} seconds`,"AI analysis processing time"],["Music Analysis","Genre",n.basicInfo?.genre||"Unknown","Primary musical genre"],["Music Analysis","Mood",n.basicInfo?.mood||"Unknown","Overall emotional mood"],["Music Analysis","BPM",n.basicInfo?.bpm||"Unknown","Beats per minute (tempo)"],["Music Analysis","Key",n.basicInfo?.key||"Unknown","Musical key signature"],["Music Analysis","Energy",Math.round((n.basicInfo?.energy||0)*100)+"%","Energy level (0-100%)"],["Music Analysis","Valence",Math.round((n.basicInfo?.valence||0)*100)+"%","Musical positivity (0-100%)"],["Music Analysis","Danceability",Math.round((n.basicInfo?.danceability||0)*100)+"%","How suitable for dancing (0-100%)"]];return n.emotions&&Object.entries(n.emotions).forEach(([o,i])=>{e.push(["Emotions",o.charAt(0).toUpperCase()+o.slice(1),Math.round(i*100)+"%",`${o} emotion intensity`])}),e.map(o=>o.map(i=>`"${i}"`).join(",")).join(`
`)}function S(n){return s(n.filename),`
AUDIO ANALYSIS REPORT
=====================

File Information:
- Filename: ${n.filename}
- Analysis Date: ${new Date(n.timestamp).toLocaleString()}
- Duration: ${Math.floor(n.duration/60)}:${(n.duration%60).toString().padStart(2,"0")}
- Format: ${n.format||"Unknown"}

Musical Analysis:
- Genre: ${n.basicInfo?.genre||"Unknown"}
- Mood: ${n.basicInfo?.mood||"Unknown"}
- BPM: ${n.basicInfo?.bpm||"Unknown"}
- Key: ${n.basicInfo?.key||"Unknown"}
- Energy: ${Math.round((n.basicInfo?.energy||0)*100)}%
- Valence: ${Math.round((n.basicInfo?.valence||0)*100)}%
- Danceability: ${Math.round((n.basicInfo?.danceability||0)*100)}%

Audio Quality:
- Overall Score: ${n.quality?.overall||0}/10
- Clarity: ${n.quality?.clarity||0}/10
- Loudness: ${n.quality?.loudness||0} dB

AI Description:
${n.aiDescription||"No description available"}

Generated by Describe Music - AI-Powered Audio Analysis
  `.trim()}function k(n){return`Audio Analysis Summary:
File: ${n.filename}
Genre: ${n.basicInfo?.genre||"Unknown"}
Mood: ${n.basicInfo?.mood||"Unknown"}
BPM: ${n.basicInfo?.bpm||"Unknown"}
Key: ${n.basicInfo?.key||"Unknown"}
Quality: ${n.quality?.overall||0}/10

Generated by Describe Music`}function D(n){return s(n.filename),`Hi there!

I just completed an AI-powered audio analysis using Describe Music and wanted to share the results with you.

File: ${n.filename}
Analysis completed: ${new Date(n.timestamp).toLocaleString()}

Key Insights:
• Genre: ${n.basicInfo?.genre||"Unknown"}
• Mood: ${n.basicInfo?.mood||"Unknown"}
• BPM: ${n.basicInfo?.bpm||"Unknown"}
• Key: ${n.basicInfo?.key||"Unknown"}
• Energy Level: ${Math.round((n.basicInfo?.energy||0)*100)}%
• Audio Quality: ${n.quality?.overall||0}/10

${n.aiDescription?`AI Description: ${n.aiDescription}`:""}

Try Describe Music for your own audio analysis: ${window.location.origin}

Best regards!`}function m(n){const e=document.createElement("div");e.className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50",e.textContent=n,document.body.appendChild(e),setTimeout(()=>{e.remove()},3e3)}window.exportAsJSON=f;window.exportAsCSV=p;window.exportReport=w;window.copyAnalysisData=b;window.copyShareLink=g;window.shareViaEmail=I;window.shareToTwitter=h;window.shareToLinkedIn=$;
