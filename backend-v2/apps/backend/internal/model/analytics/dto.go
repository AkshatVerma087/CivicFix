package analytics

// =============================================================
// GetAnalyticsPayload  ->  GET /analytics
// =============================================================

// GetAnalyticsPayload has no fields.
type GetAnalyticsPayload struct{}

// Validate always succeeds.
func (p *GetAnalyticsPayload) Validate() error { return nil }

// =============================================================
// GetLeaderboardPayload  ->  GET /leaderboard
// =============================================================

// GetLeaderboardPayload has no fields.
type GetLeaderboardPayload struct{}

// Validate always succeeds.
func (p *GetLeaderboardPayload) Validate() error { return nil }
