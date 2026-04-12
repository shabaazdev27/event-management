# ArenaLink Mega-Event Hub

The Mega-Event Hub is the core Next.js web application for the **ArenaLink** platform. It provides a dynamic, real-time dashboard for comprehensive event management, gate security monitoring, active crowd tracking, and interactive attendee engagement.

## Key Features
- **Multi-Tenant Event Management**: Full CRUD capabilities and scalable architecture for managing multiple event operations seamlessly.
- **Live Gate Security Feeds**: Stream various media formats with automated, data-driven alerts derived from real-time queue metrics.
- **CrowdVision Overlay**: Density and flow monitoring to proactively manage crowds.
- **FanZone Gamification**: High-energy, gamified experiences to keep attendees engaged during down-time.
- **Gemini AI Integration**: AI-driven features to optimize both staff workflow and attendee inquiries.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Lucide React
- **Services:** Firebase (Firestore real-time updates) and Gemini API

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file from `.env.example` and ensure you add the necessary Firebase credentials as well as your local AI keys:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing by modifying `app/page.tsx` or other relevant components in `/src`.
