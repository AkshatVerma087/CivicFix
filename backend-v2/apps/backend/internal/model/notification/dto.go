package notification

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// validate is shared by all DTOs here; it caches struct rules.
var validate = validator.New() //nolint:gochecknoglobals // shared on purpose

// =============================================================
// GetNotificationsQuery  ->  GET /notifications
// =============================================================

// GetNotificationsQuery lists the signed-in user's notifications, newest first.
// Unread is a plain bool: true = only unread; false or not sent = all.
type GetNotificationsQuery struct {
	Page   int  `query:"page" validate:"omitempty,min=1"`
	Limit  int  `query:"limit" validate:"omitempty,min=1,max=100"`
	Unread bool `query:"unread"`
}

// Validate checks paging, then defaults page/limit.
func (q *GetNotificationsQuery) Validate() error {
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
// MarkReadPayload  ->  PATCH /notifications/:id/read
// =============================================================

// MarkReadPayload marks one notification as read. The service checks it belongs to the caller.
type MarkReadPayload struct {
	ID uuid.UUID `param:"id" validate:"required"` // notification id
}

// Validate checks the notification id.
func (p *MarkReadPayload) Validate() error { return validate.Struct(p) }

// =============================================================
// MarkAllReadPayload  ->  PATCH /notifications/read-all
// =============================================================

// MarkAllReadPayload marks all of the caller's notifications as read. It has no fields.
type MarkAllReadPayload struct{}

// Validate always succeeds.
func (p *MarkAllReadPayload) Validate() error { return nil }

// =============================================================
// GetUnreadCountPayload  ->  GET /notifications/unread-count
// =============================================================

// GetUnreadCountPayload asks for the caller's unread count (the bell badge). It has no fields.
type GetUnreadCountPayload struct{}

// Validate always succeeds.
func (p *GetUnreadCountPayload) Validate() error { return nil }
