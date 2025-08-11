# Boss of Clean - Florida's #1 Cleaning Directory

> Professional cleaning services directory for Florida. Find licensed cleaners in 60 seconds.

![Boss of Clean](https://img.shields.io/badge/Next.js-13.5.1-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green?style=for-the-badge&logo=supabase)

## 🎯 Features

- **Beautiful Hero Section** with professional cat CEO mascot
- **Advanced Search Engine** by service type and ZIP code
- **User Authentication** for customers and cleaners
- **Responsive Design** for all devices
- **Florida Focus** - all 67 counties supported
- **Revenue Model** - subscription tiers for cleaning businesses

## 🛠 Tech Stack

- **Frontend**: Next.js 13 with App Router
- **Styling**: TailwindCSS with custom components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe (planned)
- **Deployment**: Netlify

## 🚀 Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
boss-of-clean/
├── app/                    # Next.js 13 App Router
│   ├── login/             # Authentication pages
│   ├── signup/            
│   ├── search/            # Search functionality
│   └── search/results/    # Search results page
├── components/            # Reusable UI components
├── lib/                   # Utilities and services
│   ├── supabase/         # Database configuration
│   ├── context/          # React Context providers
│   └── services/         # Business logic
└── supabase/             # Database schema
```

## 🔧 Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 💰 Business Model

- **Free Tier**: Basic listing
- **Basic ($29/month)**: Enhanced features
- **Pro ($79/month)**: Priority placement
- **Enterprise ($149/month)**: Featured listing + analytics

## 🎨 Design Philosophy

Boss of Clean combines professional business aesthetics with user-friendly functionality. The cat CEO mascot adds personality while maintaining trust and credibility.

## 📱 Responsive Design

Fully responsive design tested on:
- Mobile devices (iOS/Android)
- Tablets (iPad/Android tablets)
- Desktop computers
- Large displays

## 🔍 SEO Ready

- Dynamic meta tags
- Schema markup
- Florida keyword targeting
- Fast loading (Core Web Vitals optimized)

## 📈 Ready for Revenue

Boss of Clean is designed to generate revenue from day one with:
- Cleaner subscription tiers
- Featured listing upgrades  
- Local advertising opportunities
- Lead generation for cleaning businesses

---

**Built with ❤️ for Florida's cleaning industry**