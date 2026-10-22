# 🏏 IPL Mega Auction Multiplayer Game

A real-time multiplayer IPL Mega Auction web game built for 1 to 10 friends with live bidding, official player rosters, pre-auction retentions, Right-to-Match (RTM) cards, dynamic purse calculations, and a post-auction Playing XI builder.

---

## 🌟 Key Features

1. **Multiplayer Rooms (1–10 Players)**:
   - Create private rooms with 5-letter codes or join via code.
   - Pick from all 10 IPL franchises: **CSK, DC, GT, KKR, LSG, MI, PBKS, RR, RCB, SRH**.
   - **No AI Bots**: Auction exclusively runs between friends who have joined the room.

2. **Franchise Retention Phase**:
   - Retain your franchise's star players before the auction gavel falls.
   - Official IPL deduction slabs (₹18 Cr, ₹14 Cr, ₹11 Cr...) or flat rate.
   - Real-time purse deduction and lock indicators.

3. **Right to Match (RTM) Cards**:
   - When an opponent wins a bid for a player from your franchise's original squad, an interactive **RTM Challenge** pops up!
   - 12-second decision window to match the winning bid using an RTM card.

4. **Comprehensive Player Pool (290+ Players)**:
   - **256 Official Squad Players** from all 10 IPL franchises with roles, ratings, base prices, and overseas/Indian badges.
   - **36 Extra Bonus Star Players** (Glenn Maxwell, David Warner, Steve Smith, Faf du Plessis, Kane Williamson, Jonny Bairstow, etc.).
   - Host setting to easily toggle bonus players ON or OFF.

5. **In-Game Host Settings**:
   - Starting Purse (₹80 Cr, ₹100 Cr, ₹120 Cr, ₹150 Cr, or custom).
   - Allowed Retentions (0 to 6).
   - Number of RTM Cards (0 to 6).
   - Min & Max Squad size (15–25 players, max 8 overseas).
   - Bid countdown timer duration (8s to 20s) with anti-sniping protection (resets to 5s if bid under 5s).

6. **Live Broadcast UI & Sound Synthesizer**:
   - Web Audio API procedural sounds (Auction hammer strike, bid chime, urgent countdown tick, "SOLD" fanfare, RTM alert) with zero external audio assets.
   - Opponent squad inspector drawer to spy on rival purses and overseas quotas.

7. **Post-Auction Playing XI & Team Rating**:
   - Drag/click to select your best 11 (enforcing max 4 overseas & min 1 wicketkeeper).
   - Calculates Batting strength, Bowling depth, and Overall Franchise Rating (1–100★).
   - League table ranking all participating managers.
   - Host option to re-auction unsold players in an accelerated round!

---

## 🚀 Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Build frontend and start server**:
   ```bash
   npm run build
   npm start
   ```

3. Open **`http://localhost:3000`** in your browser. Open multiple incognito windows to test multiplayer bidding between friends!

---

## 🌐 Deploying to Render (Free Web Service)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of IPL auction game"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **"New +" -> "Web Service"**.
   - Connect your GitHub repository.
   - Fill in the following settings:
     - **Name**: `ipl-mega-auction` (or any name you prefer)
     - **Region**: Closest to you (e.g., Singapore, Frankfurt, Oregon)
     - **Branch**: `main`
     - **Language / Environment**: `Node`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Plan**: `Free`

3. Click **"Deploy Web Service"**.
   - Render will build the React Vite frontend and start the Express + Socket.io server.
   - Once deployed, you will get a live URL (e.g. `https://ipl-mega-auction.onrender.com`) that you and up to 10 friends can open on phones, tablets, or laptops!
