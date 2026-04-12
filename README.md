# ArenaLink: Real-Time Event Experience & Venue Management

ArenaLink is a comprehensive event management platform built to bridge the gap between venue operations and the guest experience. By leveraging real-time data and AI, the platform solves common logistical friction points found in large-scale events like sports matches, concerts, and conventions.

## 🌍 Solving Real-World Problems

### 1. Wait-Time Frustration & Bottlenecks
**Problem:** Guests often spend significant portions of an event waiting in lines for restrooms, concessions, or entry gates without knowing which areas are less crowded.
**Solution:** ArenaLink provides **Live Wait Times** and **CrowdVision** density overlays. By integrating sensor data, guests can see real-time heatmaps of the venue and navigate to the shortest queues, improving overall crowd flow and guest satisfaction.

### 2. Information Overload & Navigation
**Problem:** Navigating a massive stadium or convention center is difficult, and guests often struggle to find specific amenities or schedule updates.
**Solution:** The platform includes an **Interactive Map** with venue-aware navigation and a **Smart Chatbot**. The chatbot acts as a digital concierge, answering questions about event schedules, facility locations, and security protocols instantly.

### 3. Venue Safety & Incident Response
**Problem:** Venue staff often struggle to monitor every corner of a facility, leading to delayed responses to security incidents or medical emergencies.
**Solution:** The **Live Feeds Manager** and **Incidents Manager** allow staff to monitor security feeds and log incidents in real-time. This centralized dashboard ensures that the right personnel are dispatched quickly to resolve issues before they escalate.

### 4. Audience Engagement & "Dead Time"
**Problem:** During intermissions or pre-event periods, audience engagement often drops.
**Solution:** The **Interactive FanZone** and **FanGame** features provide gamified experiences directly on the guest's device. This keeps the energy high and provides sponsors with additional digital real-estate for engagement.

---

## 🚀 Technical Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database/Backend:** [Firebase/Firestore](https://firebase.google.com/)
- **Testing:** [Vitest](https://vitest.dev/)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18.x or later
- A Firebase project for real-time data features

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/arenalink.git
   cd arenalink/mega-event-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file based on `.env.example` and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   # ... etc
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

- `/src/app`: Next.js routes and API endpoints.
- `/src/components`: Reusable UI components (Map, Chatbot, LiveMetrics, etc.).
- `/src/lib`: Core logic including Firebase configuration and venue resolution.
- `/src/context`: React Context for managing global venue state.

---

## 🧪 Testing

The project uses Vitest for unit and integration testing. To run the suite:

```bash
npm test
```

## 🚢 Deployment

The project is Docker-ready and includes a `deploy.ps1` script for automated workflows.

```bash
docker build -t arenalink .
```
