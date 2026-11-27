package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/AkshatVerma087/go-civicfix/internal/errs"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/model/post"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
)

type PostRepository struct {
	server *server.Server
}

func NewPostRepository(server *server.Server) *PostRepository {
	return &PostRepository{
		server: server,
	}
}

// GetPostByID returns one post with its media in display order (GET /posts/:id).
// Posts are public, so there is no user filter.
// No such post -> pgx.ErrNoRows (wrapped), which sqlerr turns into a 404.
func (r *PostRepository) GetPostByID(ctx context.Context, postID uuid.UUID) (*post.PopulatedPost, error) {
	stmt := `
		SELECT
			p.*,
			COALESCE(
				jsonb_agg(
					to_jsonb(camel (m))
					ORDER BY
						m.position ASC
				) FILTER (
					WHERE
						m.id IS NOT NULL
				),
				'[]'::JSONB
			) AS media
		FROM
			posts p
			LEFT JOIN post_media m ON m.post_id = p.id
		WHERE
			p.id = @id
		GROUP BY
			p.id
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"id": postID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute get post by id query for post_id=%s: %w", postID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.PopulatedPost])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", postID.String(), err)
	}

	return &postItem, nil
}

// DeletePost deletes a post; its post_media, post_upvotes and comments go with it (ON DELETE CASCADE).
// Who may delete is checked in the service. No such post -> 404 POST_NOT_FOUND.
func (r *PostRepository) DeletePost(ctx context.Context, postID uuid.UUID) error {
	stmt := `
		DELETE FROM posts
		WHERE id = @id
	`

	result, err := r.server.DB.Pool.Exec(ctx, stmt, pgx.NamedArgs{
		"id": postID,
	})

	if err != nil {
		return fmt.Errorf("failed to execute delete post query for post_id=%s: %w", postID.String(), err)
	}

	if result.RowsAffected() == 0 {
		code := "POST_NOT_FOUND"
		return errs.NewNotFoundError("post not found", false, &code)
	}

	return nil
}

// CheckPostExists returns the post's own row (no media), for checks before an action:
// owner, status, assignee. No such post -> pgx.ErrNoRows (wrapped) -> 404.
func (r *PostRepository) CheckPostExists(ctx context.Context, postID uuid.UUID) (*post.Post, error) {
	stmt := `
		SELECT
			*
		FROM
			posts
		WHERE
			id = @id
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"id": postID,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to execute check post exists query for post_id=%s: %w", postID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", postID.String(), err)
	}

	return &postItem, nil
}

// GetPostMedia returns a post's media in display order.
// Used before DeletePost: the service needs each PublicID to delete the file from Cloudinary.
// A post with no media returns an empty slice, not an error.
func (r *PostRepository) GetPostMedia(ctx context.Context, postID uuid.UUID) ([]post.Media, error) {
	stmt := `
		SELECT
			*
		FROM
			post_media
		WHERE
			post_id = @post_id
		ORDER BY
			position ASC
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"post_id": postID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute get post media query for post_id=%s: %w", postID.String(), err)
	}

	media, err := pgx.CollectRows(rows, pgx.RowToStructByName[post.Media])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows from table:post_media for post_id=%s: %w", postID.String(), err)
	}

	return media, nil
}

// AssignPost sets the authority handling a post; AuthorityID nil unassigns it (assigned_to = NULL).
// That the authority is verified is checked in the service. No such post -> 404.
// An authority id that isn't in users -> foreign key violation, which sqlerr turns into a 400.
func (r *PostRepository) AssignPost(ctx context.Context, payload *post.AssignPostPayload) (*post.Post, error) {
	stmt := `
		UPDATE posts
		SET
			assigned_to = @assigned_to
		WHERE
			id = @id
		RETURNING
		*
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"id":          payload.ID,
		"assigned_to": payload.AuthorityID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute assign post query for post_id=%s: %w", payload.ID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", payload.ID.String(), err)
	}

	return &postItem, nil
}

// UpdatePostStatus writes a new status. Used by the status route, confirm-resolution and reject-resolution.
// statusNote nil keeps the current note. resolvedAt says what happens to resolved_by_authority_at.
// Which transitions are allowed, and for whom, is checked in the service. No such post -> 404.
func (r *PostRepository) UpdatePostStatus(ctx context.Context, postID uuid.UUID, status post.Status,
	statusNote *string, resolvedAt post.ResolvedAtChange,
) (*post.Post, error) {
	stmt := `UPDATE posts SET `
	args := pgx.NamedArgs{
		"id":     postID,
		"status": status,
	}
	setClauses := []string{"status = @status"}

	if statusNote != nil {
		setClauses = append(setClauses, "status_note = @status_note")
		args["status_note"] = *statusNote
	}

	switch resolvedAt {
	case post.ResolvedAtSetNow:
		setClauses = append(setClauses, "resolved_by_authority_at = NOW()")
	case post.ResolvedAtClear:
		setClauses = append(setClauses, "resolved_by_authority_at = NULL")
	case post.ResolvedAtKeep:
		// leave the column out of SET
	}

	stmt += strings.Join(setClauses, ", ")
	stmt += ` WHERE id = @id RETURNING *`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, args)
	if err != nil {
		return nil, fmt.Errorf("failed to execute update post status query for post_id=%s: %w", postID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", postID.String(), err)
	}

	return &postItem, nil
}

// GetPostStats counts all posts and the posts in each status (GET /posts/summary), in one pass over posts.
// With no posts at all every count is 0; COUNT always returns one row, so this never 404s.
func (r *PostRepository) GetPostStats(ctx context.Context) (*post.Stats, error) {
	stmt := `
		SELECT
			COUNT(*) AS total,
			COUNT(
				CASE
					WHEN status='new' THEN 1
				END
			) AS new,
			COUNT(
				CASE
					WHEN status='inProgress' THEN 1
				END
			) AS in_progress,
			COUNT(
				CASE
					WHEN status='pendingResolution' THEN 1
				END
			) AS pending_resolution,
			COUNT(
				CASE
					WHEN status='resolved' THEN 1
				END
			) AS resolved
		FROM
			posts
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt)
	if err != nil {
		return nil, fmt.Errorf("failed to execute get post stats query: %w", err)
	}

	stats, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Stats])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post stats: %w", err)
	}

	return &stats, nil
}

// postSortColumns maps the API's sortBy names to columns. Only these can reach ORDER BY,
// which is built with Sprintf because a column name can't be a query parameter.
var postSortColumns = map[string]string{ //nolint:gochecknoglobals // read-only lookup table
	"createdAt":     "created_at",
	"priorityScore": "priority_score",
	"upvotes":       "upvotes",
}

// GetPosts returns one page of posts plus paging info (GET /posts and GET /posts/mine).
// query must have been through Validate, which fills page, limit, sortBy and sortOrder.
// citizenID nil lists everyone's posts; set, it lists only that citizen's posts ("my posts").
func (r *PostRepository) GetPosts(ctx context.Context, query *post.GetPostsQuery,
	citizenID *string,
) (*model.PaginatedResponse[post.Post], error) {
	sortColumn, ok := postSortColumns[*query.SortBy]
	if !ok {
		return nil, fmt.Errorf("invalid sort column: %s", *query.SortBy)
	}
	sortOrder := strings.ToUpper(*query.SortOrder)
	if sortOrder != "ASC" && sortOrder != "DESC" {
		return nil, fmt.Errorf("invalid sort order: %s", *query.SortOrder)
	}

	// The same filters go into both the page query and the count query.
	conditions := []string{"TRUE"}
	args := pgx.NamedArgs{}

	if citizenID != nil {
		conditions = append(conditions, "citizen_id = @citizen_id")
		args["citizen_id"] = *citizenID
	}
	if query.Status != nil {
		conditions = append(conditions, "status = @status")
		args["status"] = *query.Status
	}
	if query.Category != nil {
		conditions = append(conditions, "category = @category")
		args["category"] = *query.Category
	}
	if query.Severity != nil {
		conditions = append(conditions, "severity = @severity")
		args["severity"] = *query.Severity
	}
	if query.AssignedTo != nil {
		conditions = append(conditions, "assigned_to = @assigned_to")
		args["assigned_to"] = *query.AssignedTo
	}

	where := strings.Join(conditions, " AND ")

	// id as a tie-breaker: posts with equal sort values keep one fixed order, so no post
	// shows up on two pages or on none.
	stmt := `
		SELECT
			*
		FROM
			posts
		WHERE
			` + where + `
		ORDER BY
			` + fmt.Sprintf("%s %s, id %s", sortColumn, sortOrder, sortOrder) + `
		LIMIT
			@limit
		OFFSET
			@offset
	`
	args["limit"] = *query.Limit
	args["offset"] = (*query.Page - 1) * (*query.Limit)

	rows, err := r.server.DB.Pool.Query(ctx, stmt, args)
	if err != nil {
		return nil, fmt.Errorf("failed to execute get posts query: %w", err)
	}

	posts, err := pgx.CollectRows(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows from table:posts: %w", err)
	}

	countStmt := `
		SELECT
			COUNT(*)
		FROM
			posts
		WHERE
			` + where

	var total int
	err = r.server.DB.Pool.QueryRow(ctx, countStmt, args).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count of posts: %w", err)
	}

	return &model.PaginatedResponse[post.Post]{
		Data:       posts,
		Page:       *query.Page,
		Limit:      *query.Limit,
		Total:      total,
		TotalPages: (total + *query.Limit - 1) / *query.Limit,
	}, nil
}

// nearbyPostsLimit caps GET /posts/nearby; the DTO has no limit and a big radius could match everything.
const nearbyPostsLimit = 100

// haversineMetres is the great-circle distance in metres from (@lat, @lng) to a post.
// LEAST(1, ...) keeps rounding error from pushing ASIN's input past 1.
const haversineMetres = `
	2 * 6371000 * ASIN(LEAST(1, SQRT(
		POWER(SIN(RADIANS(latitude - @lat) / 2), 2)
		+ COS(RADIANS(@lat)) * COS(RADIANS(latitude)) * POWER(SIN(RADIANS(longitude - @lng) / 2), 2)
	)))`

// GetNearbyPosts returns posts within radius metres of a point, nearest first, at most 100 (GET /posts/nearby).
// query must have been through Validate, which fills the default radius.
// There is no PostGIS, so the distance is the haversine formula over the latitude/longitude columns.
func (r *PostRepository) GetNearbyPosts(ctx context.Context, query *post.GetNearbyPostsQuery) ([]post.Post, error) {
	stmt := `
		SELECT
			*
		FROM
			posts
		WHERE
			` + haversineMetres + ` <= @radius
		ORDER BY
			` + haversineMetres + ` ASC,
			id ASC
		LIMIT
			@limit
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"lat":    *query.Lat,
		"lng":    *query.Lng,
		"radius": *query.Radius,
		"limit":  nearbyPostsLimit,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute get nearby posts query for lat=%f lng=%f radius=%d: %w",
			*query.Lat, *query.Lng, *query.Radius, err)
	}

	posts, err := pgx.CollectRows(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows from table:posts for nearby posts: %w", err)
	}

	return posts, nil
}

// CreatePost saves a new post and its media in one transaction: both are saved, or neither is.
// The service uploads the files to Cloudinary first and passes their details in media (in display order;
// Position is set here from the order). priorityScore is computed by the service.
// payload.Severity nil -> 'medium' and payload.LocationPriority nil -> 0, the same as the column defaults.
func (r *PostRepository) CreatePost(ctx context.Context, citizenID string, payload *post.CreatePostPayload,
	priorityScore float64, media []post.Media,
) (*post.PopulatedPost, error) {
	tx, err := r.server.DB.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin create post transaction for citizen_id=%s: %w", citizenID, err)
	}
	// After a successful Commit this does nothing; on any early return it undoes the inserts.
	defer tx.Rollback(ctx) //nolint:errcheck // the error after Commit is always ErrTxClosed

	postStmt := `
		INSERT INTO
			posts (
				citizen_id,
				title,
				description,
				category,
				severity,
				location_priority,
				latitude,
				longitude,
				priority_score
			)
		VALUES
			(
				@citizen_id,
				@title,
				@description,
				@category,
				COALESCE(@severity, 'medium'),
				COALESCE(@location_priority, 0),
				@latitude,
				@longitude,
				@priority_score
			)
		RETURNING
		*
	`

	rows, err := tx.Query(ctx, postStmt, pgx.NamedArgs{
		"citizen_id":        citizenID,
		"title":             payload.Title,
		"description":       payload.Description,
		"category":          payload.Category,
		"severity":          payload.Severity,
		"location_priority": payload.LocationPriority,
		"latitude":          payload.Latitude,
		"longitude":         payload.Longitude,
		"priority_score":    priorityScore,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute create post query for citizen_id=%s: %w", citizenID, err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for citizen_id=%s: %w", citizenID, err)
	}

	mediaStmt := `
		INSERT INTO
			post_media (
				post_id,
				kind,
				position,
				url,
				public_id,
				format,
				bytes,
				duration
			)
		VALUES
			(
				@post_id,
				@kind,
				@position,
				@url,
				@public_id,
				@format,
				@bytes,
				@duration
			)
		RETURNING
		*
	`

	savedMedia := make([]post.Media, 0, len(media))
	for i, m := range media {
		rows, err := tx.Query(ctx, mediaStmt, pgx.NamedArgs{
			"post_id":   postItem.ID,
			"kind":      m.Kind,
			"position":  i,
			"url":       m.URL,
			"public_id": m.PublicID,
			"format":    m.Format,
			"bytes":     m.Bytes,
			"duration":  m.Duration,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to execute create post media query for post_id=%s position=%d: %w",
				postItem.ID.String(), i, err)
		}

		mediaItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Media])
		if err != nil {
			return nil, fmt.Errorf("failed to collect row from table:post_media for post_id=%s position=%d: %w",
				postItem.ID.String(), i, err)
		}

		savedMedia = append(savedMedia, mediaItem)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit create post transaction for post_id=%s: %w", postItem.ID.String(), err)
	}

	return &post.PopulatedPost{
		Post:  postItem,
		Media: savedMedia,
	}, nil
}

// UpvotePost records userID's upvote and adds 1 to upvotes and PriorityPerUpvote to priority_score,
// in one transaction. Already upvoted -> 400 ALREADY_UPVOTED (the (post_id, user_id) primary key
// catches it, so there is no separate check). Call CheckPostExists first: a missing post here
// would be a foreign key error (400), not a 404.
func (r *PostRepository) UpvotePost(ctx context.Context, postID uuid.UUID, userID string) (*post.Post, error) {
	tx, err := r.server.DB.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin upvote transaction for post_id=%s user_id=%s: %w", postID.String(), userID, err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // the error after Commit is always ErrTxClosed

	result, err := tx.Exec(ctx, `
		INSERT INTO
			post_upvotes (post_id, user_id)
		VALUES
			(@post_id, @user_id)
		ON CONFLICT DO NOTHING
	`, pgx.NamedArgs{
		"post_id": postID,
		"user_id": userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute insert upvote query for post_id=%s user_id=%s: %w", postID.String(), userID, err)
	}

	if result.RowsAffected() == 0 {
		code := "ALREADY_UPVOTED"
		return nil, errs.NewBadRequestError("post already upvoted", false, &code, nil, nil)
	}

	rows, err := tx.Query(ctx, `
		UPDATE posts
		SET
			upvotes = upvotes + 1,
			priority_score = priority_score + @per_upvote
		WHERE
			id = @id
		RETURNING
		*
	`, pgx.NamedArgs{
		"id":         postID,
		"per_upvote": post.PriorityPerUpvote,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute increment upvotes query for post_id=%s: %w", postID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", postID.String(), err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit upvote transaction for post_id=%s: %w", postID.String(), err)
	}

	return &postItem, nil
}

// RemoveUpvote takes back userID's upvote and, only if there was one, takes 1 from upvotes and
// PriorityPerUpvote from priority_score, in one transaction. No upvote to remove is not an error
// (as in Node): the post comes back unchanged. No such post -> 404.
func (r *PostRepository) RemoveUpvote(ctx context.Context, postID uuid.UUID, userID string) (*post.Post, error) {
	tx, err := r.server.DB.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin remove upvote transaction for post_id=%s user_id=%s: %w", postID.String(), userID, err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // the error after Commit is always ErrTxClosed

	result, err := tx.Exec(ctx, `
		DELETE FROM post_upvotes
		WHERE
			post_id = @post_id
			AND user_id = @user_id
	`, pgx.NamedArgs{
		"post_id": postID,
		"user_id": userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute delete upvote query for post_id=%s user_id=%s: %w", postID.String(), userID, err)
	}

	// Only lower the counters if a row was really deleted; otherwise just read the post.
	stmt := `SELECT * FROM posts WHERE id = @id`
	if result.RowsAffected() > 0 {
		stmt = `
			UPDATE posts
			SET
				upvotes = upvotes - 1,
				priority_score = priority_score - @per_upvote
			WHERE
				id = @id
			RETURNING
			*
		`
	}

	rows, err := tx.Query(ctx, stmt, pgx.NamedArgs{
		"id":         postID,
		"per_upvote": post.PriorityPerUpvote,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute decrement upvotes query for post_id=%s: %w", postID.String(), err)
	}

	postItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:posts for post_id=%s: %w", postID.String(), err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit remove upvote transaction for post_id=%s: %w", postID.String(), err)
	}

	return &postItem, nil
}

// ResolveExpiredPendingPosts is for the auto-resolve job (no user, no route): every post still
// pendingResolution whose authority marked it fixed at or before cutoff becomes resolved.
// It returns those posts so the job can notify each reporter. Like confirm-resolution, it keeps the
// posts (Node deleted them). None expired -> empty slice.
func (r *PostRepository) ResolveExpiredPendingPosts(ctx context.Context, cutoff time.Time) ([]post.Post, error) {
	stmt := `
		UPDATE posts
		SET
			status = 'resolved'
		WHERE
			status = 'pendingResolution'
			AND resolved_by_authority_at <= @cutoff
		RETURNING
		*
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"cutoff": cutoff,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute resolve expired pending posts query for cutoff=%s: %w",
			cutoff.Format(time.RFC3339), err)
	}

	posts, err := pgx.CollectRows(rows, pgx.RowToStructByName[post.Post])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows from table:posts for expired pending posts: %w", err)
	}

	return posts, nil
}
