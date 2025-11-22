# Gemini Big Two (鋤大D)

A classic Cantonese card game (Cho Dai Dee) playable against AI opponents powered by **Google Gemini**. This application features intelligent 4-player gameplay, valid move checking, sound effects, and a polished, responsive UI.

## Features

*   **Smart AI**: Opponents use the Gemini API to strategize, count cards, and make decisions based on the current game state.
*   **Game Rules**: Implements standard Big Two rules (3♦ starts, card ranking, valid hand combinations).
*   **Interactive UI**: dense card layout, sorting, avatars, and smooth animations.
*   **Sound Effects**: Audio feedback for playing cards, passing, and winning.
*   **Responsive**: Playable on desktop and mobile devices.

## Prerequisites

Before you begin, you need a **Google Gemini API Key**.
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Create an API key.

## Local Development

1.  **Clone the repository** (or download the files):
    ```bash
    git clone <your-repo-url>
    cd gemini-big-two
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a file named `.env` in the root directory. Add your API key:
    ```env
    API_KEY=your_actual_api_key_here
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment (Vercel)

This project is configured to be **Vercel-ready** using Vite.

1.  **Push your code** to a Git provider (GitHub, GitLab, or Bitbucket).

2.  **Import into Vercel**:
    *   Go to your Vercel Dashboard.
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your repository.

3.  **Configure Environment Variables (Critical Step)**:
    *   In the project configuration screen, look for the **"Environment Variables"** section.
    *   Add a new variable:
        *   **Key**: `API_KEY`
        *   **Value**: *(Paste your Google Gemini API Key here)*
    *   *Note: Without this key, the AI players will not function.*

4.  **Deploy**:
    *   Click **"Deploy"**.
    *   Vercel will detect the `vite.config.ts` and `package.json` settings automatically.
    *   Once finished, your game is live!

## Tech Stack

*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **AI**: @google/genai SDK
*   **Icons**: Lucide React

## Game Rules (Big Two / 鋤大D)

*   **Objective**: Be the first to empty your hand.
*   **Card Rank**: 3 (Lowest) < 4 < ... < 10 < J < Q < K < A < 2 (Highest).
*   **Suit Rank**: ♦ Diamond < ♣ Club < ♥ Heart < ♠ Spade.
*   **The Start**: The player with the **3♦** must play it first (either singly or as part of a hand).
*   **Play**: You must beat the previous player's hand with a higher hand of the same number of cards (e.g., Single beats Single, Pair beats Pair).
*   **Pass**: If you cannot beat the current hand (or choose not to), you pass.