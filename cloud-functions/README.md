# Describe Music - Cloud Functions

Firebase Cloud Functions for the Describe Music platform, providing AI-powered audio analysis using Google's Gemini API.

## Features

- 🎵 **AI Audio Analysis**: Comprehensive music analysis using Gemini AI
- 🏷️ **Auto-Generated Tags**: SEO-friendly tags for better discoverability
- 😊 **Emotional Analysis**: Detect emotions and mood in music
- 🎭 **Structural Analysis**: Identify song sections (verse, chorus, bridge, etc.)
- ⭐ **Quality Assessment**: Evaluate audio quality and production
- 🔍 **Similarity Matching**: Find similar tracks and style influences
- 📊 **Multiple Formats**: Support for MP3, WAV, M4A, AAC, OGG, FLAC
- 🚀 **Scalable**: Built for high-performance with Firebase Functions

## Setup

### Prerequisites

- Node.js 18+
- Firebase CLI
- Google AI API Key (for Gemini)
- Firebase project

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

### Configuration

Create a `.env` file based on `env.example`:

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket

# Gemini Configuration
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=2048
GEMINI_TEMPERATURE=0.7

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4321,https://your-domain.com

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=10
MAX_FILE_SIZE_MB=50

# Environment
NODE_ENV=development
```

### Getting Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

## Development

### Local Development

1. **Start the emulators:**

   ```bash
   npm run serve
   ```

2. **Watch for changes:**

   ```bash
   npm run dev
   ```

3. **Access the functions:**
   - Functions: `http://localhost:5001`
   - Emulator UI: `http://localhost:4000`

### Testing

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests (when implemented)
npm test
```

## Deployment

### Deploy all functions:

```bash
npm run deploy
```

### Deploy specific function:

```bash
npm run deploy:analyze
```

### View logs:

```bash
npm run logs
```

## API Reference

### Analyze Audio

**Endpoint:** `POST /analyzeAudio`

**Description:** Analyze an audio file using AI

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body: Audio file as `audioFile` field

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "unique-analysis-id",
    "filename": "song.mp3",
    "timestamp": "2024-01-08T12:00:00.000Z",
    "duration": 180,
    "fileSize": "5.2 MB",
    "format": "MP3",
    "basicInfo": {
      "genre": "Electronic",
      "mood": "Energetic",
      "bpm": 128,
      "key": "C Major",
      "energy": 0.85,
      "valence": 0.72,
      "danceability": 0.89
    },
    "emotions": {
      "happy": 0.78,
      "excited": 0.82,
      "calm": 0.25
    },
    "structure": {
      "intro": { "start": 0, "end": 8 },
      "verse1": { "start": 8, "end": 32 }
    },
    "quality": {
      "overall": 8.5,
      "clarity": 9.2,
      "dynamic_range": 7.8
    },
    "similarity": {
      "similar_tracks": [
        { "title": "Similar Song", "artist": "Artist Name", "similarity": 0.87 }
      ]
    },
    "tags": ["electronic", "energetic", "dance", "high-energy"],
    "aiDescription": "A high-energy electronic track...",
    "processingTime": 1500
  },
  "timestamp": "2024-01-08T12:00:00.000Z",
  "requestId": "req-12345"
}
```

### Health Check

**Endpoint:** `GET /healthCheck`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-08T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "config": {
    "isValid": true,
    "errors": []
  },
  "services": {
    "firebase": true,
    "gemini": true
  }
}
```

## Architecture

```
cloud-functions/
├── src/
│   ├── functions/           # Cloud function handlers
│   │   └── analyzeAudio.ts  # Main audio analysis function
│   ├── services/            # External service integrations
│   │   └── geminiService.ts # Google Gemini AI service
│   ├── types/               # TypeScript type definitions
│   │   ├── analysis.ts      # Analysis-related types
│   │   ├── gemini.ts        # Gemini API types
│   │   └── index.ts         # Exported types
│   ├── utils/               # Utility functions
│   │   ├── config.ts        # Configuration management
│   │   ├── errors.ts        # Error handling
│   │   ├── logger.ts        # Logging utilities
│   │   └── prompts.ts       # AI prompt templates
│   └── index.ts             # Main entry point
├── firebase.json            # Firebase configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 50MB limit",
    "timestamp": "2024-01-08T12:00:00.000Z",
    "requestId": "req-12345"
  }
}
```

### Error Codes

- `INTERNAL_ERROR`: Unexpected server error
- `INVALID_REQUEST`: Invalid request format
- `FILE_TOO_LARGE`: File exceeds size limit
- `UNSUPPORTED_FILE_TYPE`: Unsupported audio format
- `ANALYSIS_FAILED`: AI analysis failed
- `GEMINI_API_ERROR`: Gemini API error
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

- **Max file size**: 50MB (configurable)
- **Max requests**: 10 per minute (configurable)
- **Timeout**: 9 minutes per request

## Supported Audio Formats

- MP3 (audio/mpeg)
- WAV (audio/wav)
- M4A (audio/m4a)
- AAC (audio/aac)
- OGG (audio/ogg)
- WebM (audio/webm)
- FLAC (audio/flac)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see the [LICENSE](../LICENSE) file for details.
