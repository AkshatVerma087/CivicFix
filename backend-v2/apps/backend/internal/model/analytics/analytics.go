// Package analytics holds the response structs for the analytics and leaderboard endpoints.
// Nothing here maps to a table: the numbers are computed by SQL queries.
package analytics

import "github.com/AkshatVerma087/go-civicfix/internal/model/user"

// -------------------------------------------------------------
// GET /analytics
// -------------------------------------------------------------

// =============================================================
// NameValue
// =============================================================

// NameValue is one slice of a chart, e.g. {"name": "road", "value": 12}.
// It is used for both byCategory and bySeverity.
type NameValue struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

// =============================================================
// MonthlyCount
// =============================================================

// MonthlyCount is how many posts were reported and resolved in one month.
type MonthlyCount struct {
	Month    string `json:"month"` // e.g. "Nov 2026"
	Total    int    `json:"total"`
	Resolved int    `json:"resolved"`
}

// =============================================================
// Analytics
// =============================================================

// Analytics is the response of GET /analytics.
type Analytics struct {
	ByCategory []NameValue    `json:"byCategory"`
	BySeverity []NameValue    `json:"bySeverity"`
	Monthly    []MonthlyCount `json:"monthly"`
	// nil (JSON null) until at least one post has been resolved
	AvgResolutionHours *float64 `json:"avgResolutionHours"`
}

// -------------------------------------------------------------
// GET /leaderboard
// -------------------------------------------------------------

// =============================================================
// TopReporter
// =============================================================

// TopReporter is one citizen in the leaderboard.
type TopReporter struct {
	UserID         string `json:"id"` // Clerk id
	Name           string `json:"name"`
	IssuesReported int    `json:"issuesReported"`
	TotalUpvotes   int    `json:"totalUpvotes"`
}

// =============================================================
// TopAuthority
// =============================================================

// TopAuthority is one authority in the leaderboard.
type TopAuthority struct {
	UserID     string          `json:"id"` // Clerk id
	Name       string          `json:"name"`
	Department user.Department `json:"department"`
	Assigned   int             `json:"assigned"`
	Resolved   int             `json:"resolved"`
}

// =============================================================
// Leaderboard
// =============================================================

// Leaderboard is the response of GET /leaderboard: the top 10 of each.
type Leaderboard struct {
	TopReporters   []TopReporter  `json:"topReporters"`
	TopAuthorities []TopAuthority `json:"topAuthorities"`
}
