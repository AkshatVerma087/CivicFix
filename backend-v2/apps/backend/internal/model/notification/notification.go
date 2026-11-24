// Package notification holds the notification model and DTOs.
package notification

import (
	"github.com/google/uuid"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/model/user"
)

// -------------------------------------------------------------
// ENUMS
// -------------------------------------------------------------

// Type is what a notification is about (matches the notifications.type CHECK).
type Type string

// Notification types. The values keep their hyphens to match the database.
const (
	TypeStatusUpdate           Type = "status-update"
	TypeNewComment             Type = "new-comment"
	TypeResolutionConfirmation Type = "resolution-confirmation"
	TypeAutoResolved           Type = "auto-resolved"
	TypeAssigned               Type = "assigned"
)

// Valid reports whether t is an allowed type.
func (t Type) Valid() bool {
	switch t {
	case TypeStatusUpdate, TypeNewComment, TypeResolutionConfirmation, TypeAutoResolved, TypeAssigned:
		return true
	}
	return false
}

// -------------------------------------------------------------
// TABLE: notifications
// -------------------------------------------------------------

// =============================================================
// Notification
// =============================================================

// Notification is a row in notifications. Only IsRead ever changes, so there is no updated_at.
type Notification struct {
	model.BaseWithID
	model.BaseWithCreatedAt

	RecipientID   string     `json:"recipientId" db:"recipient_id"` // Clerk id
	RecipientRole user.Role  `json:"recipientRole" db:"recipient_role"`
	Type          Type       `json:"type" db:"type"`
	Title         string     `json:"title" db:"title"`
	Message       string     `json:"message" db:"message"`
	PostID        *uuid.UUID `json:"postId" db:"post_id"` // nil: not about a post, or the post was deleted
	IsRead        bool       `json:"isRead" db:"is_read"`
}
