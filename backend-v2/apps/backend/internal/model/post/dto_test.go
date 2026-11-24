package post_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/AkshatVerma087/go-civicfix/internal/model/post"
)

func ptr[T any](v T) *T { return &v }

// validCreate returns a CreatePostPayload that passes validation; each test case changes one thing.
func validCreate() post.CreatePostPayload {
	return post.CreatePostPayload{
		Title:       "Broken streetlight",
		Description: "The light at the corner has been off for a week.",
		Category:    post.CategoryElectricity,
		Latitude:    ptr(28.6),
		Longitude:   ptr(77.2),
	}
}

func TestCreatePostPayload_Validate(t *testing.T) {
	tests := []struct {
		name    string
		modify  func(p *post.CreatePostPayload)
		wantErr bool
	}{
		{name: "valid", modify: func(_ *post.CreatePostPayload) {}},
		{name: "missing title", modify: func(p *post.CreatePostPayload) { p.Title = "" }, wantErr: true},
		{name: "unknown category", modify: func(p *post.CreatePostPayload) { p.Category = "parks" }, wantErr: true},
		{name: "latitude 0 is valid", modify: func(p *post.CreatePostPayload) { p.Latitude = ptr(0.0) }},
		{name: "latitude missing", modify: func(p *post.CreatePostPayload) { p.Latitude = nil }, wantErr: true},
		{name: "latitude out of range", modify: func(p *post.CreatePostPayload) { p.Latitude = ptr(91.0) }, wantErr: true},
		{name: "severity optional", modify: func(p *post.CreatePostPayload) { p.Severity = nil }},
		{
			name:    "bad severity",
			modify:  func(p *post.CreatePostPayload) { p.Severity = ptr(post.Severity("urgent")) },
			wantErr: true,
		},
		{
			name:   "location priority 0 is valid",
			modify: func(p *post.CreatePostPayload) { p.LocationPriority = ptr(0) },
		},
		{
			name:    "location priority 11",
			modify:  func(p *post.CreatePostPayload) { p.LocationPriority = ptr(11) },
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := validCreate()
			tt.modify(&p)
			err := p.Validate()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestGetPostsQuery_Defaults(t *testing.T) {
	q := post.GetPostsQuery{}
	require.NoError(t, q.Validate())
	require.Equal(t, 1, *q.Page)
	require.Equal(t, 20, *q.Limit)
	require.Equal(t, "createdAt", *q.SortBy)
	require.Equal(t, "desc", *q.SortOrder)
}

func TestGetPostsQuery_SortByAllowList(t *testing.T) {
	require.NoError(t, (&post.GetPostsQuery{SortBy: ptr("priorityScore")}).Validate())
	// anything outside the list is rejected, so it can never reach ORDER BY
	require.Error(t, (&post.GetPostsQuery{SortBy: ptr("title")}).Validate())
	require.Error(t, (&post.GetPostsQuery{SortBy: ptr("created_at; DROP TABLE posts")}).Validate())
}

func TestUpdatePostStatusPayload_Validate(t *testing.T) {
	id := uuid.New()
	require.NoError(t, (&post.UpdatePostStatusPayload{ID: id, Status: post.StatusInProgress}).Validate())
	require.Error(t, (&post.UpdatePostStatusPayload{ID: id, Status: "in_progress"}).Validate())
	require.Error(t, (&post.UpdatePostStatusPayload{Status: post.StatusInProgress}).Validate(), "missing id")
}

func TestGetNearbyPostsQuery_Validate(t *testing.T) {
	q := post.GetNearbyPostsQuery{Lat: ptr(0.0), Lng: ptr(0.0)}
	require.NoError(t, q.Validate())
	require.Equal(t, 2000, *q.Radius, "default radius")
	require.Error(t, (&post.GetNearbyPostsQuery{Lat: ptr(10.0)}).Validate(), "missing lng")
}

func TestStatus_Valid(t *testing.T) {
	require.True(t, post.StatusPendingResolution.Valid())
	require.False(t, post.Status("pending").Valid())
}
