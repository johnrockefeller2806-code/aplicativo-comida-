# Kangaroos Fast Delivery - PRD

## App Name
Kangaroos Fast Delivery

## Problem Statement
Delivery platform for Dublin connecting customers, restaurants, and riders.

## Tech Stack
- Frontend: React, TailwindCSS, Lucide, Sonner, Google Maps API, qrcode.react, html5-qrcode
- Backend: FastAPI, Motor (MongoDB), PyJWT, bcrypt, httpx
- Database: MongoDB (test_database)
- Auth: Emergent Google OAuth + JWT email/password

## Implemented
- Landing page with role selection
- JWT auth (email/password) + **Google OAuth** via Emergent Auth (all roles)
- Customer: Browse restaurants, cart, orders, real-time tracking with Google Maps
- Restaurant: Order management, menu CRUD, stats
- Rider: Online toggle, accept orders (max 3), earnings, full-screen Google Map
- Google Maps integration with Directions API
- Distance-based delivery fee (EUR 6 + EUR 1.50/km)
- Tip system (100% to rider)
- Seed data: 3 Dublin restaurants
- Inverted QR Code delivery confirmation (Rider shows QR, Customer scans)
- **"Ir ao Cliente" full-screen navigation** - opens in-app Google Maps with route, ETA, distance + mini QR bar
- Real-time GPS broadcasting from Rider app to backend
- Real-time rider tracking on Customer map (polling /api/orders/{id}/tracking)

## Backlog
- P0: Stripe Connect, mobile responsive polish
- P1: Push notifications, ratings system
- P2: Admin dashboard, multi-language, POS Terminal (UNIWA V6P) integration
