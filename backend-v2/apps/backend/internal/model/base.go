// Package model holds shared building blocks: base columns, pagination, geo points.
package model

import (
	"time"

	"github.com/google/uuid"
)

// =============================================================
// BaseWithID
// =============================================================

// BaseWithID adds a UUID id column.
type BaseWithID struct {
	ID uuid.UUID `json:"id" db:"id"`
}

// =============================================================
// BaseWithCreatedAt
// =============================================================

// BaseWithCreatedAt adds the created_at timestamp.
type BaseWithCreatedAt struct {
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// =============================================================
// BaseWithUpdatedAt
// =============================================================

// BaseWithUpdatedAt adds the updated_at timestamp.
type BaseWithUpdatedAt struct {
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// =============================================================
// Base
// =============================================================

// Base adds id, created_at and updated_at.
type Base struct {
	BaseWithID
	BaseWithCreatedAt
	BaseWithUpdatedAt
}

// =============================================================
// PaginatedResponse
// =============================================================

// PaginatedResponse is one page of T plus paging info.
type PaginatedResponse[T interface{}] struct {
	Data       []T `json:"data"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}
