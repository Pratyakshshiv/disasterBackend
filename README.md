# 🌍 Disaster Response Coordination Platform

A full-stack, real-time coordination system for managing disasters, verifying reports, and locating resources using maps, AI, and geospatial queries.

## 🚀 Features

- 🗺️ Interactive disaster & resource maps (Leaflet)
- 🧠 AI-based location extraction & image verification (Gemini API)
- ⚡ Real-time updates via WebSockets (Socket.IO)
- 📦 Resource filtering by type and proximity
- 🧾 Citizen report submission with verification
- 🔐 Role-based access (admin/responder/citizen)
- 📡 Official alert aggregation from NDMA
- ☁️ Deployed on Render (backend) and Vercel (frontend)

---

## 🛠️ Tech Stack

### 🔧 Frontend
- **React + Vite** – Fast, modern frontend with React Router
- **Tailwind CSS** – Utility-first responsive styling
- **Leaflet.js** – Interactive maps with clickable markers and disaster/resource overlays
- **react-hot-toast** – For real-time toasts and feedback
- **WebSockets** – Live updates for reports and resources

### ⚙️ Backend
- **Node.js + Express** – RESTful API server
- **Supabase (PostgreSQL + PostGIS)** – Data storage with spatial indexing
- **Supabase RPC** – Used for geospatial queries like “resources within 10km”
- **Socket.IO** – WebSocket integration for real-time data sync

### 🤖 AI Integration
- **Gemini API** – Used for:
  - Extracting city/neighborhood names from natural disaster descriptions
  - Verifying disaster-related images (to reject fakes or AI-generated visuals)
- **OpenStreetMap Nominatim API** – Converts extracted names into geo-coordinates

### 🧼 Data Sources
- **NDMA Website (scraped via Axios + Cheerio)** – Aggregates official government alerts
- **Mock Social Media API** – Pulls disaster-related social media content

---

## 🔐 Authentication

- **JWT-based auth** using token from backend
- Roles:
  - `admin` → can update/delete disasters
  - `responder` → can submit resources and reports
  - `citizen` → can submit reports
- Access control is enforced in both frontend UI and backend API

---

## 🧪 Key Functional Modules

### 📍 Disasters
- Create/view/update/delete (only admin)
- Gemini + OSM used to geocode disaster location from text
- Displayed on interactive map

### 🧾 Reports
- Form to submit report (with optional image URL)
- “Verify Image” button analyzes image before submission
- Realtime updates via socket
- View all reports with status filter (pending, verified, rejected)

### 📦 Resources
- Submit resource linked to a disaster
- Automatically geocoded via Gemini + OSM
- Stored with lat/lng using Supabase PostGIS
- View nearby resources (within 10km radius of disaster)
- Map view for all resources

### 🛰️ Social Media + Alerts
- Pulls mock Twitter/X-style data based on hashtags
- Scrapes NDMA India site for real alerts
- Both are cached per disaster for performance

---

## 📦 Deployment

| Platform | Stack | URL |
|----------|-------|-----|
| **Render** | Express + Supabase | `https://disasterbackend-lxmq.onrender.com/` |
| **Vercel** | React + Vite | `https://disaster-response-frontend-eight.vercel.app/` |

> This project was built to demonstrate how technology, maps, and AI can help coordinate disaster relief in real time.
