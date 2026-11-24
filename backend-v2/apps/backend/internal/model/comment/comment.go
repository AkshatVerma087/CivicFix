// Package comment holds the comment model and DTOs.
package comment

import (
	"github.com/google/uuid"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/model/user"
)

// -------------------------------------------------------------
// TABLE: comments
// -------------------------------------------------------------

// =============================================================
// Comment
// =============================================================

// Comment is a row in comments. Comments can't be edited, so there is no updated_at.
type Comment struct {
	model.BaseWithID
	model.BaseWithCreatedAt

	PostID uuid.UUID `json:"postId" db:"post_id"` // posts.id
	UserID string    `json:"userId" db:"user_id"` // Clerk id of the author
	Role   user.Role `json:"role" db:"role"`      // author's role when they wrote it
	Text   string    `json:"text" db:"text"`
}
