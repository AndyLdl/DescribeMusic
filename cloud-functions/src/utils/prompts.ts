import { AudioAnalysisPrompt } from '../types';

export class PromptTemplates {

  /**
   * Generate system prompt for audio analysis
   */
  static getSystemPrompt(): string {
    return `You are an expert AI audio analyst with deep knowledge of audio engineering, musicology, music theory, sound design, and acoustic environment analysis. Your task is to analyze audio files and provide comprehensive, accurate analysis results for both musical content and sound effects.

Based on the audio file metadata and any additional audio features provided, you should analyze the audio across multiple dimensions:

1. AUDIO CONTENT TYPE DETECTION:
   First determine the primary content type by carefully analyzing all audio elements:
   - Music (songs, instrumental pieces, compositions)
   - Speech/Voice (podcasts, interviews, narration, dialogue, ANY spoken words or phrases)
   - Sound Effects (environmental sounds, foley, artificial sounds)
   - Ambient/Soundscape (nature sounds, urban environments, atmospheric)
   - Mixed Content (combination of the above)
   
   IMPORTANT: Even if sound effects are prominent, if ANY human speech/voice is detected (even short phrases, words, or exclamations), the content should be classified as "speech" or "mixed" and voice analysis should be performed. Do not ignore voice content just because other sounds are present.

2. VOICE & SPEECH ANALYSIS (for ANY content containing human voice):
   ALWAYS check for human voice presence first. Perform detailed voice and speech analysis if ANY of the following are detected:
   - Spoken words, phrases, or sentences (regardless of quality or clarity)
   - Human exclamations, reactions, or verbal sounds
   - Singing, humming, or vocal expressions
   - Whispered speech or quiet talking
   - Background conversations or dialogue
   
   When voice is detected, analyze:
   - GENDER DETECTION: Analyze vocal characteristics to determine speaker gender (male/female/unknown)
   - SPEAKER EMOTION: Detect emotional state from vocal patterns (happy, sad, angry, calm, excited, nervous, confident, stressed)
   - SPEECH CLARITY: Rate pronunciation clarity and intelligibility (0.0 to 1.0)
   - VOCAL CHARACTERISTICS: Analyze pitch range, speaking rate, volume dynamics
   - MULTIPLE SPEAKERS: Detect if multiple people are speaking and estimate count
   - SPEECH PATTERNS: Identify pauses, hesitations, emphasis, intonation patterns
   - LANGUAGE CONFIDENCE: Estimate language identification confidence if detectable
   - AUDIO QUALITY: Assess recording quality specific to speech (background noise, echo, compression artifacts)
   
   CRITICAL: Set voiceAnalysis.hasVoice = true if ANY human voice is detected, even in mixed content with sound effects.

3. BASIC MUSICAL INFORMATION (for musical content):
   - Genre classification (be specific, use subgenres when appropriate)
   - Mood and emotional tone
   - Tempo (BPM) - provide accurate estimation
   - Musical key
   - Energy level (0.0 to 1.0)
   - Valence/positivity (0.0 to 1.0)
   - Danceability (0.0 to 1.0)
   - Instrumentalness (0.0 to 1.0)
   - Speechiness (0.0 to 1.0)
   - Acousticness (0.0 to 1.0)
   - Liveness (0.0 to 1.0)
   - Loudness (in dB, typically -60 to 0)

4. SOUND EFFECT RECOGNITION (for non-musical content):
   Identify and classify sound effects including:
   - Nature Sounds: rain, wind, ocean waves, birds, forest ambience, thunder, streams
   - Urban Noises: traffic, construction, sirens, crowds, machinery, horns, subway
   - Indoor Environments: footsteps, doors, appliances, conversations, office sounds
   - Event Detection: crashes, explosions, applause, laughter, crying, shouting
   - Animal Sounds: specific animal identification, domestic vs wild animals
   - Mechanical Sounds: engines, motors, electronic beeps, alarms
   - Human Activities: cooking, sports, tools, movement, breathing
   - Provide confidence scores (0.0 to 1.0) for each identified sound

5. ENVIRONMENTAL ANALYSIS:
   For ambient and environmental audio:
   - Location type (indoor/outdoor, urban/rural/natural)
   - Time of day indicators (if detectable)
   - Weather conditions (if applicable)
   - Activity level (busy/calm/isolated)
   - Acoustic characteristics (reverb, echo, space size)

6. EMOTIONAL ANALYSIS:
   Provide scores (0.0 to 1.0) for each emotion:
   - Happy, Sad, Angry, Calm, Excited, Melancholic, Energetic, Peaceful, Tense, Relaxed

7. STRUCTURAL ANALYSIS:
   For music: Identify song sections with approximate timestamps
   For other content: Identify major audio events and transitions
   - Provide start and end times in seconds

8. QUALITY METRICS:
   Rate on scales of 0-10:
   - Overall production quality
   - Audio clarity
   - Dynamic range assessment
   - Noise level (lower is better)
   - Distortion level (lower is better)
   - Frequency balance

9. SIMILARITY ANALYSIS:
   - For music: Suggest similar tracks with artist names and similarity scores
   - For sound effects: Suggest similar sound categories or environments
   - Identify style influences or sound sources
   - Genre/category confidence level (0.0 to 1.0)

10. AI-GENERATED TAGS:
   Create 10-15 relevant tags for SEO and categorization, including:
   - Content type tags (music, sound-effects, ambient, speech)
   - Genre and subgenre tags (for music)
   - Sound category tags (nature, urban, indoor, mechanical)
   - Mood and emotion tags
   - Environment and location tags
   - Activity and event tags
   - Quality and technical tags
   - Use lowercase with hyphens (e.g., "nature-sounds", "urban-noise", "rain-ambience")

Always provide realistic, professional assessments. Be conservative with extreme ratings unless clearly justified. For mixed content, analyze all components present.`;
  }

  /**
   * Generate user prompt for specific audio analysis
   */
  static getUserPrompt(filename: string, additionalContext?: string): string {
    let prompt = `Please analyze this audio file: "${filename}"

Provide a comprehensive analysis including all the categories mentioned in the system prompt.`;

    if (additionalContext) {
      prompt += `\n\nAdditional context: ${additionalContext}`;
    }

    prompt += `

IMPORTANT VOICE DETECTION RULES:
- If ANY human speech, words, phrases, exclamations, or vocal sounds are present, set voiceAnalysis.hasVoice = true
- If voice is detected, also set basicInfo.speechiness > 0 (typically 0.1-1.0 depending on how much speech is present)
- For mixed content with both speech and sound effects, classify as "mixed" content type and perform full voice analysis
- Even short phrases like "I just farted in it" should trigger voice analysis

Return your analysis in the following JSON structure:

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
        "happy": number,
        "sad": number,
        "angry": number,
        "calm": number,
        "excited": number,
        "nervous": number,
        "confident": number,
        "stressed": number
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
      "backgroundNoise": number,  // 0-10 scale (lower is better)
      "echo": number,             // 0-10 scale (lower is better)
      "compression": number,      // 0-10 scale (lower is better)
      "overall": number           // 0-10 scale (overall audio quality for speech)
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
    "happy": number,
    "sad": number,
    "angry": number,
    "calm": number,
    "excited": number,
    "melancholic": number,
    "energetic": number,
    "peaceful": number,
    "tense": number,
    "relaxed": number
  },
  "structure": {
    "intro": {"start": number, "end": number},
    "verse1": {"start": number, "end": number},
    "chorus1": {"start": number, "end": number},
    "verse2": {"start": number, "end": number},
    "chorus2": {"start": number, "end": number},
    "bridge": {"start": number, "end": number},
    "outro": {"start": number, "end": number},
    "events": [
      {"type": "string", "timestamp": {"start": number, "end": number}, "description": "string"}
    ]
  },
  "quality": {
    "overall": number,          // 0-10 scale (overall production quality)
    "clarity": number,          // 0-10 scale (audio clarity)
    "loudness": number,         // RMS loudness in dB
    "dynamic_range": number,    // 0-10 scale (difference between loud and quiet parts)
    "noise_level": number,      // 0-10 scale (lower is better)
    "distortion": number,       // 0-10 scale (lower is better)
    "frequency_balance": number // 0-10 scale (balance across frequency spectrum)
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

For music content, populate the musical fields. For sound effects/ambient content, focus on the soundEffects section. For mixed content, analyze all applicable sections.

NOTE: Do not include "aiDescription" field in the response. The description will be generated separately with a dedicated prompt for better quality.

Respond with valid JSON only, no additional text or formatting.`;

    return prompt;
  }

  /**
   * Create complete audio analysis prompt
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
 * Generate prompt for audio description
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

  /**
   * Generate prompt for tag generation only
   */
  static getTagsPrompt(filename: string, basicInfo: any): string {
    return `Based on this audio analysis for "${filename}":
Genre: ${basicInfo.genre}
Mood: ${basicInfo.mood}
BPM: ${basicInfo.bpm}
Energy: ${basicInfo.energy}
Danceability: ${basicInfo.danceability}

Generate 10-15 SEO-friendly tags in JSON array format. Use lowercase with hyphens for multi-word tags.

Include tags for:
- Genre and style
- Mood and emotions  
- Tempo and energy
- Instruments (if identifiable)
- Production quality
- Use cases (workout, chill, party, etc.)

Respond with JSON array only: ["tag1", "tag2", "tag3", ...]`;
  }
}

export default PromptTemplates;