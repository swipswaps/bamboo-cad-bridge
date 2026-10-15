BAMBOO CAD BRIDGE

Local-first parametric bamboo CAD bridge for Blender and Godot.

This project provides a Vite + React static frontend that can run standalone
or connect to an optional local FastAPI Docker backend. The frontend detects
the backend at http://localhost:8000. If the backend is absent, the app falls
back to client-side JavaScript calculations.

DOWNLOAD LINK
https://github.com/swipswaps/bamboo-cad-bridge/archive/refs/heads/main.zip

COPY BUTTON
In the ChatGPT code block, use the copy button. In plain text, select all and copy.

QUICK START

Option 1: Live web interface
Open the GitHub Pages site after deployment:
https://swipswaps.github.io/bamboo-cad-bridge/

Option 2: Local Docker backend and frontend

1. Clone the repository:
   git clone https://github.com/swipswaps/bamboo-cad-bridge.git
   cd bamboo-cad-bridge

2. Start the backend container:
   docker compose up -d

3. Install frontend dependencies:
   npm install

4. Start the Vite development server:
   npm run dev

5. Open http://localhost:5173 in your browser.

The status badge will show Docker Backend Active when the container is running.
If the container is not running, the app runs in Standalone Mode.

API ENDPOINTS

Health check:
GET http://localhost:8000/health

Generate parametric spec:
POST http://localhost:8000/api/generate-spec
Content-Type: application/json

Example payload:
[
  {
    "culm_id": "Column_01",
    "length_m": 3.0,
    "basal_diameter_m": 0.12,
    "top_diameter_m": 0.10,
    "wall_thickness_m": 0.015,
    "node_spacing_m": 0.28
  }
]

LICENSE
MIT License. See LICENSE for details.
