// Package post holds the post models and DTOs.
package post

import (
	"time"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// -------------------------------------------------------------
// ENUMS
// -------------------------------------------------------------

// =============================================================
// Category
// =============================================================

// Category is the kind of issue (matches the posts.category CHECK).
type Category string

// Categories a post can have.
const (
	CategoryWater       Category = "water"
	CategoryElectricity Category = "electricity"
	CategoryRoad        Category = "road"
	CategorySanitation  Category = "sanitation"
	CategoryOther       Category = "other"
)

// Valid reports whether c is one of the allowed categories.
func (c Category) Valid() bool {
	switch c {
	case CategoryWater, CategoryElectricity, CategoryRoad, CategorySanitation, CategoryOther:
		return true
	}
	return false
}

// =============================================================
// Status
// =============================================================

// Status goes new -> inProgress -> pendingResolution -> resolved.
type Status string

// Statuses a post can be in.
const (
	StatusNew               Status = "new"
	StatusInProgress        Status = "inProgress"
	StatusPendingResolution Status = "pendingResolution"
	StatusResolved          Status = "resolved"
)

// Valid reports whether s is one of the allowed statuses.
func (s Status) Valid() bool {
	switch s {
	case StatusNew, StatusInProgress, StatusPendingResolution, StatusResolved:
		return true
	}
	return false
}

// =============================================================
// Severity
// =============================================================

// Severity is how urgent the citizen says the issue is.
type Severity string

// Severity levels a citizen can choose.
const (
	SeverityLow    Severity = "low"
	SeverityMedium Severity = "medium"
	SeverityHigh   Severity = "high"
)

// Valid reports whether s is one of the allowed severities.
func (s Severity) Valid() bool {
	switch s {
	case SeverityLow, SeverityMedium, SeverityHigh:
		return true
	}
	return false
}

// =============================================================
// Priority score
// =============================================================

// Priority score = severity weight*5 + upvotes*PriorityPerUpvote + location priority (Node's formula).
// The upvote queries add or take away PriorityPerUpvote, so they don't recompute the whole score.
const PriorityPerUpvote = 2

// =============================================================
// ResolvedAtChange
// =============================================================

// ResolvedAtChange is what a status change does to resolved_by_authority_at.
// The zero value keeps it, so forgetting to set it changes nothing.
type ResolvedAtChange int

// What a status change can do to resolved_by_authority_at.
const (
	ResolvedAtKeep   ResolvedAtChange = iota // leave as is (e.g. reporter confirms: pendingResolution -> resolved)
	ResolvedAtSetNow                         // set to NOW() (authority marks fixed: -> pendingResolution)
	ResolvedAtClear                          // set to NULL (reporter rejects: pendingResolution -> inProgress)
)

// -------------------------------------------------------------
// TABLE: posts
// -------------------------------------------------------------

// =============================================================
// Post
// =============================================================

// Post is an issue reported by a citizen (a row in posts).
type Post struct {
	model.Base                // id, createdAt, updatedAt
	CitizenID        string   `json:"citizenId" db:"citizen_id"` // Clerk id of the reporter
	Title            string   `json:"title" db:"title"`
	Description      string   `json:"description" db:"description"`
	Category         Category `json:"category" db:"category"`
	Latitude         float64  `json:"latitude" db:"latitude"`
	Longitude        float64  `json:"longitude" db:"longitude"`
	Status           Status   `json:"status" db:"status"`
	Severity         Severity `json:"severity" db:"severity"`
	LocationPriority int      `json:"locationPriority" db:"location_priority"` // 0-10
	// computed from severity, upvotes and location priority
	PriorityScore float64 `json:"priorityScore" db:"priority_score"`
	Upvotes       int     `json:"upvotes" db:"upvotes"`
	StatusNote    string  `json:"statusNote" db:"status_note"`
	// authority handling it; nil = unassigned
	AssignedTo *string `json:"assignedTo" db:"assigned_to"`
	// when the authority marked it fixed; nil until then
	ResolvedByAuthorityAt *time.Time `json:"resolvedByAuthorityAt" db:"resolved_by_authority_at"`
}

// -------------------------------------------------------------
// RESPONSES
// -------------------------------------------------------------

// =============================================================
// PopulatedPost
// =============================================================

// PopulatedPost is a post with its media (GET /posts/:id).
type PopulatedPost struct {
	Post
	Media []Media `json:"media" db:"media"`
}

// =============================================================
// Stats
// =============================================================

// Stats counts posts per status (GET /posts/summary).
type Stats struct {
	Total             int `json:"total" db:"total"`
	New               int `json:"new" db:"new"`
	InProgress        int `json:"inProgress" db:"in_progress"`
	PendingResolution int `json:"pendingResolution" db:"pending_resolution"`
	Resolved          int `json:"resolved" db:"resolved"`
}
