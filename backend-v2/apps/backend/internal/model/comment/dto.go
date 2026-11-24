package comment

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// validate is shared by all DTOs here; it caches struct rules.
var validate = validator.New() //nolint:gochecknoglobals // shared on purpose

// =============================================================
// GetCommentsQuery  ->  GET /posts/:id/comments
// =============================================================

// GetCommentsQuery lists a post's comments, oldest first.
// Page and Limit are plain ints: 0 is never valid, so 0 means "not sent".
type GetCommentsQuery struct {
	ID    uuid.UUID `param:"id" validate:"required"` // post id
	Page  int       `query:"page" validate:"omitempty,min=1"`
	Limit int       `query:"limit" validate:"omitempty,min=1,max=100"`
}

// Validate checks the post id and paging, then defaults page/limit.
func (q *GetCommentsQuery) Validate() error {
	if err := validate.Struct(q); err != nil {
		return err
	}
	if q.Page == 0 {
		q.Page = 1
	}
	if q.Limit == 0 {
		q.Limit = 20
	}
	return nil
}

// =============================================================
// CreateCommentPayload  ->  POST /posts/:id/comments
// =============================================================

// CreateCommentPayload adds a comment to a post.
type CreateCommentPayload struct {
	ID   uuid.UUID `param:"id" validate:"required"` // post id
	Text string    `json:"text" validate:"required,max=1000"`
}

// Validate checks the post id and the comment text.
func (p *CreateCommentPayload) Validate() error {
	return validate.Struct(p)
}

// =============================================================
// DeleteCommentPayload  ->  DELETE /posts/:id/comments/:commentId
// =============================================================

// DeleteCommentPayload removes a comment (its author or an admin).
type DeleteCommentPayload struct {
	ID        uuid.UUID `param:"id" validate:"required"`        // post id
	CommentID uuid.UUID `param:"commentId" validate:"required"` // comment id
}

// Validate checks both ids.
func (p *DeleteCommentPayload) Validate() error {
	return validate.Struct(p)
}
