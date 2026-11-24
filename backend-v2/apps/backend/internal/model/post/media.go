package post

import (
	"github.com/google/uuid"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// -------------------------------------------------------------
// ENUMS
// -------------------------------------------------------------

// =============================================================
// MediaKind
// =============================================================

// MediaKind is the type of file attached to a post.
// Values match the post_media.kind CHECK.
type MediaKind string

// Kinds of media a post can have.
const (
	MediaKindImage MediaKind = "image"
	MediaKindVideo MediaKind = "video"
)

// Valid reports whether k is an allowed kind.
func (k MediaKind) Valid() bool {
	switch k {
	case MediaKindImage, MediaKindVideo:
		return true
	}
	return false
}

// -------------------------------------------------------------
// TABLE: post_media
// -------------------------------------------------------------

// =============================================================
// Media
// =============================================================

// Media is one image or video of a post; the file lives in Cloudinary.
type Media struct {
	// no updated_at column, so not model.Base
	model.BaseWithID
	model.BaseWithCreatedAt

	PostID   uuid.UUID `json:"postId" db:"post_id"`    // the post this belongs to (posts.id)
	Kind     MediaKind `json:"kind" db:"kind"`         // image or video
	Position int       `json:"position" db:"position"` // display order within the post: 0, 1, 2...
	URL      string    `json:"url" db:"url"`           // Cloudinary URL the frontend shows

	// nullable columns: nil = NULL
	PublicID *string  `json:"publicId" db:"public_id"` // Cloudinary id, needed to delete the file
	Format   *string  `json:"format" db:"format"`      // jpg, png, mp4...
	Bytes    *int64   `json:"bytes" db:"bytes"`        // file size in bytes
	Duration *float64 `json:"duration" db:"duration"`  // video length in seconds; nil for images
}
