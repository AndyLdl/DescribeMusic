# 🎵 Describe Music - AI-Powered Audio Analysis Platform

**Describe Music** is a comprehensive AI-powered platform that analyzes audio files and provides detailed insights including genre classification, emotional analysis, structural breakdown, quality assessment, and AI-generated tags for better discoverability.

## ✨ Features

### 🎯 Core Functionality

- **🤖 AI Audio Analysis**: Powered by Google's Gemini AI for comprehensive music analysis
- **🎵 Multi-Format Support**: MP3, WAV, M4A, AAC, OGG, WebM, FLAC
- **😊 Emotional Analysis**: Detect emotions and mood in music (happy, sad, energetic, calm, etc.)
- **🏷️ AI-Generated Tags**: SEO-friendly tags for better searchability and categorization
- **📊 Quality Assessment**: Evaluate audio clarity, dynamic range, and production quality
- **🎭 Structural Analysis**: Identify song sections (intro, verse, chorus, bridge, outro)
- **🔍 Similarity Matching**: Find similar tracks and musical influences
- **📱 Responsive Design**: Works perfectly on desktop and mobile devices

### 🎨 User Experience

- **✨ Beautiful Glassmorphism UI**: Modern, engaging interface with smooth animations
- **📈 Real-time Analysis**: Watch your audio being analyzed with dynamic progress indicators
- **📚 Analysis History**: Automatic saving and quick access to previous analyses
- **📤 Export & Share**: JSON, CSV, and text report exports with social media sharing
- **🌙 Dark Theme**: Elegant dark design optimized for extended use

### 🔧 Technical Features

- **⚡ Fast Performance**: Built with Astro for optimal loading speeds
- **🔐 Secure Processing**: Files processed securely without permanent storage
- **📊 Comprehensive Data**: Detailed musical and technical analysis
- **🌐 Cloud-Powered**: Scalable Firebase Cloud Functions backend
- **🎯 SEO Optimized**: Automatic meta tags and structured data

## 🚀 Technology Stack

### Frontend

- **⚡ Astro**: Static site generation with islands architecture
- **⚛️ React**: Interactive components for complex UI
- **🎨 Tailwind CSS**: Utility-first CSS framework
- **📱 TypeScript**: Type-safe development
- **🌊 Glassmorphism**: Modern frosted glass design aesthetics

### Backend

- **🔥 Firebase Functions**: Serverless cloud functions
- **🤖 Google Gemini AI**: Advanced AI for audio analysis
- **📝 TypeScript**: Full-stack type safety
- **🔧 Node.js 18**: Modern JavaScript runtime

### Infrastructure

- **☁️ Google Cloud**: Reliable cloud infrastructure
- **🚀 Firebase**: Authentication, hosting, and functions
- **📈 Analytics**: Performance and usage tracking

## 📦 Project Structure

```
DescribeMusic/
├── src/                          # Frontend source code
│   ├── components/              # React/Astro components
│   │   ├── analyze/            # Analysis-specific components
│   │   ├── sections/           # Homepage sections
│   │   └── navbar/            # Navigation components
│   ├── layouts/               # Page layouts
│   ├── pages/                 # Route pages
│   ├── utils/                 # Utility functions
│   └── styles/               # Global styles
├── cloud-functions/           # Backend cloud functions
│   ├── src/                  # TypeScript source
│   │   ├── functions/       # Cloud function handlers
│   │   ├── services/        # External service integrations
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Backend utilities
│   ├── package.json         # Backend dependencies
│   └── firebase.json        # Firebase configuration
├── public/                   # Static assets
└── docs/                    # Documentation
```

## 🛠️ Quick Start

### Prerequisites

- **Node.js 18+**
- **pnpm** (recommended) or npm
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google AI Studio Account** (for Gemini API key)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/describe-music.git
cd describe-music

# Install frontend dependencies
pnpm install

# Install cloud functions dependencies
cd cloud-functions
npm install
cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit with your configuration
vim .env
```

### 3. Cloud Functions Setup

```bash
# Setup cloud functions (see CLOUD_FUNCTIONS_SETUP.md for details)
cd cloud-functions
cp env.example .env
npm run build
```

### 4. Development

```bash
# Start cloud functions emulator
cd cloud-functions
npm run serve

# In another terminal, start frontend
cd ..
pnpm dev
```

Visit:

- **Frontend**: http://localhost:4321
- **Cloud Functions**: http://localhost:5001

### 5. Production Deployment

```bash
# Deploy cloud functions
cd cloud-functions
npm run deploy

# Build and deploy frontend
cd ..
pnpm build
# Deploy to your hosting provider
```

## 📖 Documentation

- **[Cloud Functions Setup Guide](CLOUD_FUNCTIONS_SETUP.md)**: Complete backend setup
- **[MVP Implementation Plan](MVP_IMPLEMENTATION_PLAN.md)**: Project roadmap
- **[Long-term Evolution Blueprint](LONG_TERM_EVOLUTION_BLUEPRINT.md)**: Future plans
- **[API Documentation](cloud-functions/README.md)**: Cloud functions API reference

## 🎯 Usage

### Basic Analysis Flow

1. **Upload Audio**: Drag & drop or click to select audio file (up to 50MB)
2. **AI Processing**: Watch real-time analysis progress with visual feedback
3. **Explore Results**: Navigate through comprehensive analysis tabs:
   - **Overview**: Basic info, metrics, and AI-generated tags
   - **Emotions**: Detailed emotional analysis breakdown
   - **Structure**: Song sections with timestamps
   - **Quality**: Technical audio quality assessment
   - **Similarity**: Similar tracks and style influences
4. **Export & Share**: Download results or share on social media

### Analysis Results Include

- **🎵 Musical Information**: Genre, mood, BPM, key, energy levels
- **😊 Emotional Scores**: 8 different emotion categories with confidence levels
- **🎭 Song Structure**: Automated section detection with timing
- **⭐ Quality Metrics**: Overall quality, clarity, dynamic range, noise levels
- **🔍 Similar Content**: Comparable tracks and musical influences
- **🏷️ Smart Tags**: 10-15 SEO-optimized tags for categorization
- **📝 AI Description**: Human-readable summary of the audio

## 🔧 Configuration

### Environment Variables

```bash
# Cloud Functions URL
VITE_CLOUD_FUNCTIONS_URL=http://localhost:5001/your-project-id/us-central1

# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_API_KEY=your-api-key

# API Settings
VITE_API_TIMEOUT=300000
VITE_MAX_FILE_SIZE_MB=50
```

### Customization

- **🎨 Styling**: Modify `tailwind.config.mjs` for custom colors and design
- **🤖 AI Prompts**: Update `cloud-functions/src/utils/prompts.ts` for different analysis focus
- **📊 Analysis Options**: Configure analysis depth in cloud function calls
- **🏷️ Tag Generation**: Customize tag categories in the AI service

## 📊 Performance

- **⚡ Load Time**: < 2 seconds initial page load
- **🚀 Analysis Speed**: 30-120 seconds depending on file size and complexity
- **📱 Mobile Support**: Fully responsive design
- **🔄 Offline Support**: Progressive Web App capabilities
- **📈 Scalability**: Serverless architecture handles traffic spikes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards

- **TypeScript**: Full type safety required
- **ESLint**: Follow configured linting rules
- **Prettier**: Consistent code formatting
- **Testing**: Add tests for new features
- **Documentation**: Update docs for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google AI**: For the powerful Gemini API
- **Firebase**: For reliable cloud infrastructure
- **Astro**: For the amazing static site framework
- **Tailwind CSS**: For beautiful, utility-first styling
- **React**: For interactive UI components

## 📞 Support

- **📧 Email**: support@describemusic.com
- **💬 Discord**: [Join our community](https://discord.gg/your-server)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-username/describe-music/issues)
- **📚 Documentation**: [Full documentation](https://docs.describemusic.com)

---

**Built with ❤️ by the Describe Music Team**

_Making music analysis accessible to everyone through the power of AI._
