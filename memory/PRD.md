# Kangaroos Fast Delivery - PRD

## App Name
Kangaroos Fast Delivery

## Problem Statement
Delivery platform for Dublin connecting customers, restaurants, and riders. Key features: instant payment for riders, transparent payment splits, student rider tracking, order batching.

## Users
- **Customers**: Order food, track delivery in real-time, scan QR to confirm delivery
- **Restaurants**: Manage menus/orders
- **Riders**: Independent (unlimited) / Student (20h/week, Fri-Sun)

## Tech Stack
- Frontend: React, TailwindCSS, Lucide, Sonner, Google Maps API, qrcode.react, html5-qrcode
- Backend: FastAPI, Motor (MongoDB), PyJWT, bcrypt
- Database: MongoDB (test_database)

## Implemented
- Landing page with role selection
- JWT auth for all roles
- Customer: Browse restaurants, cart, orders, real-time tracking with Google Maps
- Restaurant: Order management, menu CRUD, stats
- Rider: Online toggle, accept orders (max 3), earnings, full-screen Google Map
- Google Maps integration (replaced Leaflet) with Directions API
- Distance-based delivery fee (EUR 6 + EUR 1.50/km)
- Tip system (100% to rider)
- Seed data: 3 Dublin restaurants (Crazy Potato, Dublin Burger Co., Sushi Garden)
- Inverted QR Code delivery confirmation (Rider shows QR, Customer scans)
- "Ir ao Cliente" button - opens external Google Maps navigation to customer address
- Real-time GPS broadcasting from Rider app to backend (watchPosition API)
- Real-time rider tracking on Customer map (polling /api/orders/{id}/tracking)
- Backend distinguishes real GPS vs simulated GPS (gps_source field)

## Architecture
```
/app/
├── backend/
│   ├── server.py             # Main FastAPI application
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RiderApp.js         # Rider dashboard, GPS broadcasting, "Ir ao Cliente"
│   │   │   ├── CustomerApp.js      # Customer dashboard, QR Scanner
│   │   │   ├── OrderTracker.js     # Order progress stepper + delivery map
│   │   │   ├── GoogleMapsDelivery.js # Real-time delivery map with tracking
│   │   │   ├── SimpleGoogleMap.js  # Rider idle map
│   │   │   ├── googleMapsConfig.js # Centralized Maps API loader
│   │   │   └── QRScanner.js        # html5-qrcode scanner
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
```

## Key API Endpoints
- PUT /api/rider/location - Rider sends GPS (updates order + rider_profiles)
- GET /api/orders/{id}/tracking - Returns rider position (real or simulated)
- POST /api/customer/confirm-delivery - Customer scans QR to complete delivery
- POST /api/rider/accept/{id} - Rider accepts order

## Date
March 31, 2026

## Backlog
- P0: Stripe Connect, mobile responsive polish
- P1: Push notifications, ratings system
- P2: Admin dashboard, multi-language, POS Terminal (UNIWA V6P) integration
