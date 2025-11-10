import { AudioAnalysisPrompt } from '../types';

/**
 * 优化的提示词模板系统
 * 重点：清晰、简洁、有效
 */
export class PromptTemplates {

  /**
   * 系统提示词 - 定义AI角色和分析流程
   */
  static getSystemPrompt(): string {
    return `You are an expert audio analyst specializing in music, speech, and sound analysis.

=== ANALYSIS WORKFLOW ===

STEP 1: CONTENT TYPE CLASSIFICATION
Listen to the ENTIRE audio. Determine primary content:
- Music: Organized musical composition (melody, harmony, rhythm)
- Speech: Spoken words, dialogue, narration, ANY verbal content
- Sound Effects: Environmental sounds, foley, artificial sounds
- Ambient: Atmospheric soundscapes, nature sounds
- Mixed: Multiple content types present

⚠️ CRITICAL: If you hear BOTH speech and other sounds → classify as "mixed" and analyze ALL components

STEP 2: VOICE DETECTION (Highest Priority)
Answer: "Is there ANY human voice in this audio?"
- Single word or phrase = YES (hasVoice: true)
- Background conversation = YES
- Singing/humming = YES
- Only instrumental/effects = NO

If YES → Perform complete voice analysis:
  • Gender (analyze vocal pitch and timbre)
  • Emotion (prosody, tone, speaking pace)
  • Clarity (pronunciation, intelligibility)
  • Speaking characteristics

STEP 3: PRIMARY CONTENT ANALYSIS

For MUSIC:
- Genre: Be specific with subgenres (not just "Electronic" → "Deep House")
- BPM: Count actual beats carefully
- Musical key: Identify by tonal center
- Energy/Valence: Compare to reference tracks below

For SPEECH:
- Gender: Vocal pitch/timbre analysis
- Emotion: Listen to prosody, pace, tone
- Clarity: Rate intelligibility honestly
- Context: Type of speech (podcast, dialogue, narration)

For SOUND EFFECTS:
- Identify specific sounds (not just "nature" → "bird chirping + stream")
- Timestamp sound occurrences
- Rate confidence based on clarity

For MIXED CONTENT:
- Analyze ALL components separately
- Set speechiness for voice percentage
- Set instrumentalness for music percentage
- List sound effects with timestamps

STEP 4: QUALITY & SIMILARITY
- Evaluate audio quality (clarity, loudness, noise, distortion)
- Note similar tracks, sounds, or style influences
- Assess genre confidence

⚠️ NOTE: Structure/timeline analysis is performed separately with a dedicated prompt for higher accuracy

=== CALIBRATION REFERENCES ===

Energy Scale (0.0-1.0):
• 0.1 = Ambient meditation, very calm
• 0.3 = Slow ballad, relaxed
• 0.5 = Mid-tempo pop, casual
• 0.7 = Upbeat dance, energetic
• 0.9 = Intense EDM, aggressive

Valence/Positivity (0.0-1.0):
• 0.1 = Very sad, dark, depressing
• 0.3 = Melancholic, somber
• 0.5 = Neutral
• 0.7 = Uplifting, cheerful
• 0.9 = Extremely joyful, euphoric

Speechiness (0.0-1.0):
• 0.0-0.05 = Pure instrumental
• 0.05-0.2 = Occasional vocals
• 0.2-0.4 = Verse-chorus songs
• 0.4-0.6 = Vocal-heavy music
• 0.6-0.8 = Rap, rhythmic speech
• 0.8-1.0 = Pure speech (podcast, dialogue)

BPM Ranges:
• <60 = Very slow (funeral march, drone)
• 60-80 = Slow (ballads, hip-hop)
• 80-100 = Moderate (pop, R&B)
• 100-120 = Medium-fast (disco, house)
• 120-140 = Fast (EDM, rock)
• 140-160 = Very fast (drum & bass)
• >160 = Extremely fast (hardcore)

Quality Ratings (0-10 scale):
• 0-3 = Poor (heavy distortion, very noisy)
• 4-6 = Acceptable (noticeable issues)
• 7-8 = Good (professional, minor flaws)
• 9-10 = Excellent (studio quality, rare)

=== QUALITY ASSURANCE ===

✅ DO:
- Analyze ACTUAL audio, not filename
- Be precise (128 BPM, not "fast")
- Use realistic confidence (0.6-0.8 normal, 0.9+ only for obvious cases)
- Acknowledge ALL content (don't ignore brief speech)
- Provide specific genres/sounds

❌ DON'T:
- Assume based on filename
- Miss speech in mixed content (any voice → hasVoice: true)
- Use unrealistic perfect scores
- Make all metrics extreme
- Provide generic answers

Remember: ACCURACY over speed. Analyze thoroughly.`;
  }

  /**
   * 用户提示词 - 具体分析任务
   */
  static getUserPrompt(filename: string, additionalContext?: string): string {
    let prompt = `Analyze the audio file: "${filename}"`;

    if (additionalContext) {
      prompt += `\n\nContext: ${additionalContext}`;
    }

    prompt += `

CRITICAL INSTRUCTIONS:
1. If ANY human speech/voice is detected (even one word), set voiceAnalysis.hasVoice = true
2. For mixed content with speech + other sounds, classify as "mixed" and analyze BOTH components
3. Set basicInfo.speechiness based on how much speech is present (0.0-1.0)
4. Use calibration references from system prompt for consistent ratings

Return analysis in this JSON structure:

{
  "contentType": {
    "primary": "music|speech|sound-effects|ambient|mixed",
    "confidence": number,
    "description": "string"
  },
  "basicInfo": {
    "genre": "string",
    "mood": "string",
    "bpm": number,
    "key": "string",
    "energy": number,
    "valence": number,
    "danceability": number,
    "instrumentalness": number,
    "speechiness": number,
    "acousticness": number,
    "liveness": number,
    "loudness": number
  },
  "voiceAnalysis": {
    "hasVoice": boolean,
    "speakerCount": number,
    "genderDetection": {
      "primary": "male|female|unknown",
      "confidence": number,
      "multipleGenders": boolean
    },
    "speakerEmotion": {
      "primary": "happy|sad|angry|calm|excited|nervous|confident|stressed|neutral",
      "confidence": number,
      "emotions": {
        "happy": number, "sad": number, "angry": number, "calm": number,
        "excited": number, "nervous": number, "confident": number, "stressed": number
      }
    },
    "speechClarity": {
      "score": number,
      "pronunciation": number,
      "articulation": number,
      "pace": "slow|normal|fast",
      "volume": "quiet|normal|loud"
    },
    "vocalCharacteristics": {
      "pitchRange": "low|medium|high",
      "speakingRate": number,
      "pauseFrequency": "low|medium|high",
      "intonationVariation": number
    },
    "languageAnalysis": {
      "language": "string",
      "confidence": number,
      "accent": "string"
    },
    "audioQuality": {
      "backgroundNoise": number,
      "echo": number,
      "compression": number,
      "overall": number
    }
  },
  "soundEffects": {
    "detected": [
      {
        "category": "nature|urban|indoor|mechanical|human|animal|event",
        "type": "string",
        "confidence": number,
        "timestamp": {"start": number, "end": number},
        "description": "string"
      }
    ],
    "environment": {
      "location_type": "indoor|outdoor|mixed",
      "setting": "urban|rural|natural|domestic|commercial",
      "activity_level": "busy|moderate|calm|isolated",
      "acoustic_space": "small|medium|large|open",
      "time_of_day": "unknown|morning|day|evening|night",
      "weather": "unknown|clear|rain|wind|storm"
    }
  },
  "emotions": {
    "happy": number, "sad": number, "angry": number, "calm": number, "excited": number,
    "melancholic": number, "energetic": number, "peaceful": number, "tense": number, "relaxed": number
  },
  "quality": {
    "overall": number,
    "clarity": number,
    "loudness": number,
    "dynamic_range": number,
    "noise_level": number,
    "distortion": number,
    "frequency_balance": number
  },
  "similarity": {
    "similar_tracks": [
      {"title": "string", "artist": "string", "similarity": number, "genre": "string"}
    ],
    "similar_sounds": [
      {"category": "string", "description": "string", "similarity": number}
    ],
    "style_influences": ["string"],
    "genre_confidence": number
  },
  "tags": ["string"]
}

IMPORTANT: 
- Do NOT include "aiDescription" field (generated separately)
- Do NOT include "structure" field (analyzed separately with dedicated prompt for accuracy)
- Respond with valid JSON only, no markdown formatting
- Ensure all numbers are in valid ranges
- If hasVoice = true, speakerCount must be > 0
- Use contentType to guide your analysis (music/speech/ambient/sound-effects)`;

    return prompt;
  }

  /**
   * 创建完整的分析提示词
   */
  static createAnalysisPrompt(
    filename: string,
    duration: number,
    format: string,
    size: number,
    additionalContext?: string
  ): AudioAnalysisPrompt {
    return {
      systemPrompt: this.getSystemPrompt(),
      userPrompt: this.getUserPrompt(filename, additionalContext),
      audioMetadata: {
        filename,
        duration,
        format,
        size
      }
    };
  }

  /**
   * 结构分析提示词 - 单独分析以提高时间轴准确度
   */
  static getStructurePrompt(filename: string, duration: number, contentType?: string): string {
    return `You are an expert audio analyst with professional training in music structure analysis. Your ONLY task is to listen to the entire audio file MULTIPLE TIMES and identify EXACT timestamps for structural changes.

Audio File: "${filename}"
Total Duration: ${duration} seconds
${contentType ? `Content Type: ${contentType}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL ACCURACY REQUIREMENTS:

1. 🎧 **LISTEN 3 TIMES MINIMUM:**
   - 1st listen: Get overall structure understanding
   - 2nd listen: Mark approximate timestamps
   - 3rd listen: VERIFY and REFINE exact timestamps

2. 📍 **TIMESTAMP PRECISION:**
   - Use decimal precision (e.g., 8.5, 32.7, 45.3 seconds)
   - Mark the EXACT MOMENT you hear the change (not before, not after)
   - Listen to the transition point 2-3 times to be certain

3. 🎯 **IDENTIFY CLEAR MARKERS:**
   For each section change, listen for:
   - Melody changes (new musical phrase starts)
   - Rhythm/drum pattern changes
   - Vocal entries or exits
   - Chord progression changes
   - Energy/dynamic shifts
   - Instrumental changes (new instruments enter)

4. ✅ **VERIFICATION CHECKLIST (for EACH timestamp):**
   □ Can you HEAR a clear change at this exact second?
   □ Does it match the pattern of the section type?
   □ Is this the EARLIEST point the change occurs?
   □ Have you verified by listening 2+ times?

---

📋 IDENTIFICATION GUIDELINES:

For MUSIC:
- Listen for melodic changes, chord progressions, vocal entries
- Common sections: intro, verse, pre-chorus, chorus, bridge, solo, interlude, outro
- Use the flexible "sections" array format:

{
  "sections": [
    {"name": "intro", "index": 0, "start": 0, "end": 8.5, "description": "soft piano intro"},
    {"name": "verse", "index": 1, "start": 8.5, "end": 32.2, "description": "storytelling verse"},
    {"name": "pre-chorus", "index": 1, "start": 32.2, "end": 40.8, "description": "building tension"},
    {"name": "chorus", "index": 1, "start": 40.8, "end": 56.3, "description": "energetic chorus"},
    {"name": "verse", "index": 2, "start": 56.3, "end": 80.1, "description": "second verse"},
    {"name": "chorus", "index": 2, "start": 80.1, "end": 96.5, "description": "chorus repeat"}
  ],
  "events": [
    {"type": "key-change", "timestamp": {"start": 96.5, "end": 96.5}, "description": "Key change from C to D major"}
  ]
}

For SPEECH/PODCAST:
- DO NOT use music sections (no intro/verse/chorus)
- Use "events" array to mark topic changes, speaker changes, pauses:

{
  "sections": [],
  "events": [
    {"type": "introduction", "timestamp": {"start": 0, "end": 15.2}, "description": "Host introduces the topic"},
    {"type": "topic-change", "timestamp": {"start": 45.8, "end": 45.8}, "description": "Transition to main discussion"},
    {"type": "speaker-change", "timestamp": {"start": 120.5, "end": 120.5}, "description": "Guest speaker begins"}
  ]
}

For SOUND EFFECTS/AMBIENT:
- Use "events" to mark significant sound changes:

{
  "sections": [],
  "events": [
    {"type": "sound-start", "timestamp": {"start": 0, "end": 5.3}, "description": "Thunder begins"},
    {"type": "sound-transition", "timestamp": {"start": 15.7, "end": 15.7}, "description": "Rain starts"},
    {"type": "sound-peak", "timestamp": {"start": 45.2, "end": 52.8}, "description": "Heavy rain and wind"}
  ]
}

---

🎼 SECTION NAMING GUIDE:

**Music Sections:**
- intro, verse, pre-chorus, chorus, bridge, solo (guitar-solo, piano-solo, etc.), interlude, breakdown, drop, build-up, outro

**Event Types:**
- For music: key-change, tempo-change, dynamic-shift, solo-start, solo-end
- For speech: introduction, topic-change, speaker-change, question, answer, conclusion
- For ambient: sound-start, sound-transition, sound-peak, sound-fade, sound-end

---

⚠️ TIMESTAMP ACCURACY CHECKLIST:
□ Did you listen to the ENTIRE audio?
□ Are your timestamps in SECONDS (not mm:ss)?
□ Did you mark where sections actually START and END (not approximate)?
□ Are all sections in chronological order?
□ Do sections cover the full duration without large gaps?
□ Did you verify each timestamp by listening again?

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 ANALYSIS WORKFLOW (FOLLOW THESE STEPS):

**STEP 1: Initial Listen (0:00 to end)**
- Listen to the entire audio WITHOUT pausing
- Note the general structure and number of sections
- Identify the audio type (music/speech/ambient/effects)

**STEP 2: Detailed Analysis (Listen again with focus)**
For MUSIC:
- At 0:00 - What starts the audio? (intro/direct to verse?)
- Listen for when the first vocal/main melody begins
- Listen for when chorus energy kicks in (if applicable)
- Mark where you hear repetition (verse 2, chorus 2, etc.)
- Identify any bridge, solo, or special sections
- Note how the audio ends (outro/fade/abrupt?)

For SPEECH:
- Mark when speaker starts talking
- Identify topic changes (listen for phrase transitions)
- Note any pauses or section breaks
- Mark speaker changes (if multiple speakers)

For AMBIENT/EFFECTS:
- Identify different sound layers entering/exiting
- Mark significant volume or intensity changes
- Note environmental transitions

**STEP 3: Timestamp Verification (Listen a THIRD time)**
- Play from 5 seconds BEFORE each marked timestamp
- Confirm the change happens at your marked second
- Adjust timestamp if needed (be precise to 0.1 second)
- Remove any uncertain timestamps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 OUTPUT FORMAT:

Return ONLY valid JSON (no markdown, no explanations, no analysis text):

{
  "sections": [
    {
      "name": "intro",
      "index": 0,
      "start": 0,
      "end": 8.5,
      "description": "soft piano with ambient pads",
      "confidence": "high"
    }
    // ... more sections
  ],
  "events": [
    {
      "type": "key-change",
      "timestamp": {"start": 96.5, "end": 96.5},
      "description": "Modulation from C to D major",
      "confidence": "high"
    }
    // ... more events
  ]
}

⚠️ IMPORTANT:
- All timestamps in SECONDS (decimal format like 8.5, not "0:08")
- Only include sections you are CONFIDENT about
- Add "confidence": "high" or "medium" to each section/event
- If you're uncertain about a timestamp, OMIT it rather than guess

🎧 Now listen to the audio 3+ times and provide ACCURATE, VERIFIED timestamps!`;
  }

  /**
   * 描述生成提示词 - 详细版（恢复原版以提高质量）
   */
  static getDescriptionPrompt(filename: string): string {
    return `Analyze the audio file "${filename}" and provide a comprehensive, engaging description that thoroughly captures the essence and key characteristics of the audio content. Use multiple sentences as needed to fully convey the audio experience.

Guidelines for different content types:

For MUSIC:
- Genre, subgenre, and style characteristics
- Mood, energy level, and emotional tone
- Tempo, rhythm, and musical structure
- Instrumentation and production qualities
- Vocal characteristics (if present)
- Overall atmosphere and listening experience

For SPEECH:
- Speaker characteristics (gender, age impression, accent)
- Vocal tone, clarity, and delivery style
- Emotional quality and confidence level
- Speaking pace and articulation
- Content context (if discernible)
- Audio recording quality and environment

For SOUND EFFECTS:
- Specific sounds and their sources
- Environmental context and setting
- Spatial characteristics and acoustics
- Intensity, duration, and progression
- Potential use cases or applications
- Overall atmosphere created

For AMBIENT/SOUNDSCAPE:
- Environmental setting and location type
- Layered sound elements and their interaction
- Temporal progression and variations
- Immersive qualities and mood
- Natural vs artificial sound sources
- Listening experience and emotional impact

Example descriptions:
- Music: "A sophisticated jazz ballad featuring a sultry female vocalist accompanied by gentle piano melodies, soft brushed drums, and a warm upright bass. The track maintains a slow, intimate tempo around 70 BPM with rich harmonic progressions that create a romantic, late-night lounge atmosphere perfect for quiet contemplation."

- Speech: "A professional male narrator with a deep, authoritative voice delivers clear, well-paced commentary in American English. His confident tone and precise articulation suggest expertise in the subject matter, while the clean studio recording quality ensures excellent clarity throughout the presentation."

- Sound Effects: "An immersive thunderstorm sequence begins with distant rumbling that gradually intensifies into sharp, crackling thunder strikes accompanied by heavy rainfall. The stereo field captures the storm's movement and depth, creating a dramatic natural soundscape ideal for relaxation or atmospheric enhancement."

Make the description:
- Thorough and detailed while remaining engaging
- Professional and constructive in tone
- Rich in sensory and contextual details
- Informative about the complete listening experience
- Accessible to both casual and professional listeners
- Specific about technical and artistic qualities

Respond with just the description, no additional formatting.`;
  }

}

export default PromptTemplates;
