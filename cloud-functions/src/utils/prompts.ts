import { AudioAnalysisPrompt } from '../types';

export class PromptTemplates {

    /**
     * Generate system prompt for audio analysis
     */
    static getSystemPrompt(): string {
        return `You are an expert AI music analyst with deep knowledge of audio engineering, musicology, and music theory. Your task is to analyze audio files and provide comprehensive, accurate analysis results.

Based on the audio file metadata and any additional audio features provided, you should analyze the music across multiple dimensions:

1. BASIC MUSICAL INFORMATION:
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

2. EMOTIONAL ANALYSIS:
   Provide scores (0.0 to 1.0) for each emotion:
   - Happy, Sad, Angry, Calm, Excited, Melancholic, Energetic, Peaceful

3. STRUCTURAL ANALYSIS:
   Identify song sections with approximate timestamps:
   - Intro, Verse, Chorus, Bridge, Outro, etc.
   - Provide start and end times in seconds

4. QUALITY METRICS:
   Rate on scales of 0-10:
   - Overall production quality
   - Audio clarity
   - Dynamic range assessment
   - Noise level (lower is better)
   - Distortion level (lower is better)
   - Frequency balance

5. SIMILARITY ANALYSIS:
   - Suggest 3-5 similar tracks with artist names and similarity scores
   - Identify musical style influences
   - Genre confidence level (0.0 to 1.0)

6. AI-GENERATED TAGS:
   Create 10-15 relevant tags for SEO and categorization, including:
   - Genre and subgenre tags
   - Mood and emotion tags
   - Tempo and energy tags
   - Instrument and vocal tags
   - Quality and production tags
   - Use lowercase with hyphens (e.g., "indie-rock", "high-energy")

Always provide realistic, professional assessments. Be conservative with extreme ratings unless clearly justified.`;
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

Return your analysis in the following JSON structure:

{
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
  "emotions": {
    "happy": number,
    "sad": number,
    "angry": number,
    "calm": number,
    "excited": number,
    "melancholic": number,
    "energetic": number,
    "peaceful": number
  },
  "structure": {
    "intro": {"start": number, "end": number},
    "verse1": {"start": number, "end": number},
    "chorus1": {"start": number, "end": number},
    "verse2": {"start": number, "end": number},
    "chorus2": {"start": number, "end": number},
    "bridge": {"start": number, "end": number},
    "outro": {"start": number, "end": number}
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
    "style_influences": ["string"],
    "genre_confidence": number
  },
  "tags": ["string"],
  "aiDescription": "A comprehensive one-sentence description of the audio"
}

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
     * Generate prompt for music description only
     */
    static getDescriptionPrompt(filename: string): string {
        return `Analyze the audio file "${filename}" and provide a single, comprehensive sentence that describes the music, including genre, mood, tempo, and key characteristics. Make it engaging and informative for listeners.

Example: "A high-energy electronic dance track with pulsing synthesizers, driving 128 BPM beat, and uplifting melodies that create an euphoric, club-ready atmosphere."

Respond with just the description sentence, no additional formatting.`;
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