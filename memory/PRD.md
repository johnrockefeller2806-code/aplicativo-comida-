# Kangaroos Fast Delivery - PRD

## App Name
Kangaroos Fast Delivery

## Problem Statement
Delivery platform for Dublin connecting customers, restaurants, and riders. Key features: instant payment for riders, transparent payment splits, student rider tracking, order batching.

## Users
- **Customers**: Order food
- **Restaurants**: Manage menus/orders
- **Riders**: Independent (unlimited) / Student (20h/week, Fri-Sun)

## Tech Stack
- Frontend: React, TailwindCSS, Lucide, Sonner, React-Leaflet
- Backend: FastAPI, Motor (MongoDB), PyJWT, bcrypt

## Implemented
- Landing page with role selection
- JWT auth for all roles
- Customer: Browse restaurants, cart, orders, tracking
- Restaurant: Order management, menu CRUD, stats
- Rider: Online toggle, accept orders (max 3), earnings, map
- Live delivery map with GPS simulation
- Distance-based delivery fee (EUR 6 + EUR 1.50/km)
- Tip system (100% to rider)
- Seed data: 3 Dublin restaurants

## Date
March 31, 2026 - Project opened from GitHub

## Backlog
- P0: Stripe Connect, mobile responsive
- P1: Push notifications, real GPS, ratings
- P2: Admin dashboard, multi-language
