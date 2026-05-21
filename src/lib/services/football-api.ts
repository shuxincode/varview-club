// VARview.club Football Data Service
// Replaced all RapidAPI/Foreign API calls with AI-led web search via the prediction engine.
// The hard researcher (Gemini 1.5 Flash) searches the web for fixture data and team info.

// ---- Auth / RBAC types ----

export interface AuthContext {
  userId: string;
  isAdmin?: boolean;
}

// ---- RBAC guard ----

export function assertPredictionAccess(auth: AuthContext): void {
  // All authenticated users have access
}

// ---- All data now comes from the Al-led prediction engine ----
// See: prediction-engine/app/scrapers/ai_search.py
// Endpoints:
//   GET /search/fixtures?q=<team>
//   GET /search/team-form?team=<team>
//   GET /search/h2h?home=<team>&away=<team>
//   GET /search/team-conditions?team=<team>
//   GET /predict?q=<home>+vs+<away>
