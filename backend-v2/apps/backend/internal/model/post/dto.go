package post

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// validate is shared by all DTOs here; it caches struct rules.
var validate = validator.New() //nolint:gochecknoglobals // shared on purpose

// Tags: param = path, query = ?k=v, json = JSON body, form = multipart.

// -------------------------------------------------------------
// PATH ID ONLY
// -------------------------------------------------------------

// =============================================================
// GetPostByIDPayload  ->  GET /posts/:id
// =============================================================

// GetPostByIDPayload gets one post.
type GetPostByIDPayload struct {
	ID uuid.UUID `param:"id" validate:"required"` // bad UUID -> 400 at bind
}

// Validate checks the post id.
func (p *GetPostByIDPayload) Validate() error { return validate.Struct(p) }

// =============================================================
// DeletePostPayload  ->  DELETE /posts/:id
// =============================================================

// DeletePostPayload deletes a post.
type DeletePostPayload struct {
	ID uuid.UUID `param:"id" validate:"required"`
}

// Validate checks the post id.
func (p *DeletePostPayload) Validate() error { return validate.Struct(p) }

// =============================================================
// ConfirmResolutionPayload  ->  POST /posts/:id/confirm-resolution
// =============================================================

// ConfirmResolutionPayload is sent when the reporter accepts the fix.
type ConfirmResolutionPayload struct {
	ID uuid.UUID `param:"id" validate:"required"`
}

// Validate checks the post id.
func (p *ConfirmResolutionPayload) Validate() error { return validate.Struct(p) }

// =============================================================
// RejectResolutionPayload  ->  POST /posts/:id/reject-resolution
// =============================================================

// RejectResolutionPayload is sent when the reporter says it isn't fixed.
type RejectResolutionPayload struct {
	ID uuid.UUID `param:"id" validate:"required"`
}

// Validate checks the post id.
func (p *RejectResolutionPayload) Validate() error { return validate.Struct(p) }

// -------------------------------------------------------------
// LIST QUERIES (all optional, so pointers: nil = not sent)
// -------------------------------------------------------------

// =============================================================
// GetPostsQuery  ->  GET /posts
// =============================================================

// GetPostsQuery is paging, sorting and filters. SortBy uses API names, not columns.
type GetPostsQuery struct {
	Page       *int      `query:"page" validate:"omitempty,min=1"`
	Limit      *int      `query:"limit" validate:"omitempty,min=1,max=100"`
	SortBy     *string   `query:"sortBy" validate:"omitempty,oneof=createdAt priorityScore upvotes"`
	SortOrder  *string   `query:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Status     *Status   `query:"status" validate:"omitempty,oneof=new inProgress pendingResolution resolved"`
	Category   *Category `query:"category" validate:"omitempty,oneof=water electricity road sanitation other"`
	Severity   *Severity `query:"severity" validate:"omitempty,oneof=low medium high"`
	AssignedTo *string   `query:"assignedTo" validate:"omitempty,startswith=user_,max=64"`
}

// Validate checks the filters and fills in defaults.
func (q *GetPostsQuery) Validate() error {
	if err := validate.Struct(q); err != nil {
		return err
	}
	// defaults (the validator has no "default" rule)
	if q.Page == nil {
		page := 1
		q.Page = &page
	}
	if q.Limit == nil {
		limit := 20
		q.Limit = &limit
	}
	if q.SortBy == nil {
		sortBy := "createdAt"
		q.SortBy = &sortBy
	}
	if q.SortOrder == nil {
		sortOrder := "desc"
		q.SortOrder = &sortOrder
	}
	return nil
}

// =============================================================
// GetMyPostsQuery  ->  GET /posts/mine
// =============================================================

// GetMyPostsQuery is paging only; the user comes from the Clerk token.
type GetMyPostsQuery struct {
	Page  *int `query:"page" validate:"omitempty,min=1"`
	Limit *int `query:"limit" validate:"omitempty,min=1,max=100"`
}

// Validate checks paging and defaults page/limit.
func (q *GetMyPostsQuery) Validate() error {
	if err := validate.Struct(q); err != nil {
		return err
	}
	if q.Page == nil {
		page := 1
		q.Page = &page
	}
	if q.Limit == nil {
		limit := 20
		q.Limit = &limit
	}
	return nil
}

// =============================================================
// GetNearbyPostsQuery  ->  GET /posts/nearby
// =============================================================

// GetNearbyPostsQuery finds posts within radius metres. Pointers: 0 is valid.
type GetNearbyPostsQuery struct {
	Lat    *float64 `query:"lat" validate:"required,gte=-90,lte=90"`
	Lng    *float64 `query:"lng" validate:"required,gte=-180,lte=180"`
	Radius *int     `query:"radius" validate:"omitempty,min=1,max=50000"` // metres
}

// Validate checks the coordinates and defaults radius to 2000.
func (q *GetNearbyPostsQuery) Validate() error {
	if err := validate.Struct(q); err != nil {
		return err
	}
	if q.Radius == nil {
		radius := 2000
		q.Radius = &radius
	}
	return nil
}

// =============================================================
// GetPostStatsPayload  ->  GET /posts/summary
// =============================================================

// GetPostStatsPayload has no fields.
type GetPostStatsPayload struct{}

// Validate always succeeds.
func (p *GetPostStatsPayload) Validate() error { return nil }

// -------------------------------------------------------------
// CHANGING A POST (path id + JSON body)
// -------------------------------------------------------------

// =============================================================
// UpdatePostStatusPayload  ->  PATCH /posts/:id/status
// =============================================================

// UpdatePostStatusPayload changes the status; transitions are checked in the service.
type UpdatePostStatusPayload struct {
	ID         uuid.UUID `param:"id" validate:"required"`
	Status     Status    `json:"status" validate:"required,oneof=new inProgress pendingResolution resolved"`
	StatusNote *string   `json:"statusNote" validate:"omitempty,max=500"` // nil = keep the current note
}

// Validate checks the id, status and note.
func (p *UpdatePostStatusPayload) Validate() error { return validate.Struct(p) }

// =============================================================
// AssignPostPayload  ->  PATCH /posts/:id/assign
// =============================================================

// AssignPostPayload assigns a post to an authority (admin only).
type AssignPostPayload struct {
	ID          uuid.UUID `param:"id" validate:"required"`
	AuthorityID *string   `json:"authorityId" validate:"omitempty,startswith=user_,max=64"` // nil = unassign
}

// Validate checks the post id and authority id.
func (p *AssignPostPayload) Validate() error { return validate.Struct(p) }

// -------------------------------------------------------------
// CREATING A POST (multipart form)
// -------------------------------------------------------------

// =============================================================
// CreatePostPayload  ->  POST /posts
// =============================================================

// CreatePostPayload is the multipart form for a new post.
// Files (up to 10 photos or 1 video) are read by the handler.
type CreatePostPayload struct {
	Title            string    `form:"title" validate:"required,max=200"`
	Description      string    `form:"description" validate:"required,max=2000"`
	Category         Category  `form:"category" validate:"required,oneof=water electricity road sanitation other"`
	Severity         *Severity `form:"severity" validate:"omitempty,oneof=low medium high"` // nil = medium (DB default)
	LocationPriority *int      `form:"locationPriority" validate:"omitempty,min=0,max=10"`  // nil = 0
	Latitude         *float64  `form:"latitude" validate:"required,gte=-90,lte=90"`
	Longitude        *float64  `form:"longitude" validate:"required,gte=-180,lte=180"`
}

// Validate checks the fields and coordinate ranges.
func (p *CreatePostPayload) Validate() error { return validate.Struct(p) }
