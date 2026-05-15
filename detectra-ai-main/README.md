# Detecra AI - Intelligent Detection Systems

A cutting-edge AI detection platform powered by Nexariza AI. Supervision is phase-based: Phases 1-2 by Dr. Usman Aamer and Phases 3-4 by Dr. Yasin Nasir at University of Central Punjab.

## 🚀 Features

### Core Features
- **Advanced AI Detection Systems** - State-of-the-art image recognition and pattern analysis
- **Real-time Processing** - Lightning-fast inference with <10ms response times
- **Multi-industry Applications** - Healthcare, security, and industrial automation
- **Edge Computing Support** - Optimized for on-device AI processing

### Technical Features
- **Modern React Architecture** - Built with React 18, TypeScript, and Vite
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Progressive Web App** - PWA support with offline capabilities
- **Performance Optimized** - Advanced performance monitoring and optimization
- **SEO Optimized** - Complete SEO implementation with structured data
- **Analytics Integration** - Comprehensive user behavior tracking

### UI/UX Features
- **Interactive Animations** - Smooth Framer Motion animations
- **Particle Background** - Dynamic particle system for visual appeal
- **Cursor Trail Effects** - Interactive cursor following animations
- **Modern Glassmorphism** - Contemporary design with glass effects
- **Dark Theme** - Professional dark theme with cyan accents

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Advanced animations and transitions
- **Vite** - Fast build tool and development server

### Backend & Services
- **Supabase** - Backend-as-a-Service for database and authentication
- **PWA** - Progressive Web App capabilities
- **Service Worker** - Offline functionality and caching

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📱 PWA Features

- **Offline Support** - Service worker for offline functionality
- **App-like Experience** - Native app-like behavior
- **Push Notifications** - Real-time notifications support
- **Install Prompt** - Easy installation on mobile devices

## 🎨 Design System

### Color Palette
- **Primary**: Cyan (#22d3ee) to Blue (#3b82f6) gradient
- **Background**: Dark gray (#0f172a) to black
- **Accent**: Violet (#8b5cf6) for highlights
- **Text**: White with gray variations

### Typography
- **Primary Font**: Inter (body text)
- **Heading Font**: Poppins (headings and titles)
- **Font Weights**: 300, 400, 500, 600, 700, 800, 900

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nexariza/detecra-ai.git
   cd detecra-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── About.tsx       # About section
│   ├── Analytics.tsx   # Analytics tracking
│   ├── AppLoader.tsx   # Loading screen
│   ├── Blog.tsx        # Blog/Insights section
│   ├── Careers.tsx     # Careers section
│   ├── Contact.tsx     # Contact form
│   ├── CursorTrail.tsx # Cursor trail effect
│   ├── ErrorBoundary.tsx # Error handling
│   ├── Footer.tsx      # Footer component
│   ├── Hero.tsx        # Hero section
│   ├── Navbar.tsx      # Navigation bar
│   ├── Newsletter.tsx  # Newsletter signup
│   ├── ParticleBackground.tsx # Particle effects
│   ├── PerformanceOptimizer.tsx # Performance optimization
│   ├── Projects.tsx    # Projects showcase
│   ├── ScrollToTop.tsx # Scroll to top button
│   ├── SEO.tsx         # SEO optimization
│   ├── Stats.tsx       # Statistics section
│   ├── Team.tsx        # Team members
│   ├── Technology.tsx  # Technology showcase
│   └── Testimonials.tsx # Customer testimonials
├── lib/                # Utility libraries
│   └── supabase.ts     # Supabase configuration
├── App.tsx            # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values
VITE_SUPABASE_URL=https://txkwnceefmaotmqluajc.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important**: 
- Never commit `.env` files to version control
- For production, set environment variables in your hosting platform
- See `.env.example` for all available variables

### Supabase Setup
1. Create a new Supabase project
2. Set up the database schema (see `supabase/migrations/`)
3. Configure authentication and security policies

## 📊 Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals**: All green
- **Bundle Size**: Optimized with code splitting
- **Load Time**: <2s on 3G networks

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Quick Start

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Preview production build**:
   ```bash
   npm run preview:prod
   ```

### Deployment Platforms

#### Vercel (Recommended - Easiest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```
- Automatic HTTPS
- Global CDN
- Zero configuration needed
- See `DEPLOYMENT.md` for detailed instructions

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```
- Configuration file: `netlify.toml` (already included)

#### Docker
```bash
# Build Docker image
docker build -t detectra-ai .

# Run container
docker run -p 3000:80 detectra-ai
```
- Dockerfile and nginx.conf included

#### AWS S3 + CloudFront
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
```
- Configure CloudFront for SPA routing

**📖 For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

## 📈 Analytics & Monitoring

The application includes comprehensive analytics tracking:
- Page views and user interactions
- Scroll depth tracking
- Section view tracking
- Button click tracking
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Ahmad Yasin** - Founder & CEO, Nexariza AI
- **Eman Sarfraz** - Chief Operating Officer, Nexariza AI
- **Abdul Rehman** - AI/ML Engineer, Detecra AI
- **Dr. Usman Aamer** - Supervisor (Phases 1-2) & Director, FOIT, University of Central Punjab
- **Dr. Yasin Nasir** - Supervisor (Phases 3-4), University of Central Punjab

## 📞 Contact

- **Email**: contact@nexariza.com
- **Phone**: +92 370 7348001
- **Website**: [https://detecra.ai](https://detecra.ai)
- **LinkedIn**: [Detecra AI](https://linkedin.com/company/detecra-ai)

## 🙏 Acknowledgments

- University of Central Punjab for academic support
- Dr. Usman Aamer (Phases 1-2 supervision)
- Dr. Yasin Nasir (Phases 3-4 supervision)
- Nexariza AI team for technical excellence
- Open source community for amazing tools and libraries

---

**Detecra AI** - Empowering the world with intelligent detection systems. A proud innovation of the Nexariza AI ecosystem.
