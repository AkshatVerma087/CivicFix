package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/AkshatVerma087/go-civicfix/internal/errs"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/model/comment"
	"github.com/AkshatVerma087/go-civicfix/internal/model/user"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
)

type CommentRepository struct {
	server *server.Server
}

func NewCommentRepository(server *server.Server) *CommentRepository {
	return &CommentRepository{server: server}
}

// CreateComment adds userID's comment to the post in payload.ID. role is the author's role now; it is
// stored with the comment so the UI can show "authority" replies. Call CheckPostExists first:
// a missing post here would be a foreign key error (400), not a 404.
func (r *CommentRepository) CreateComment(ctx context.Context, userID string, role user.Role,
	payload *comment.CreateCommentPayload,
) (*comment.Comment, error) {
	stmt := `
		INSERT INTO
			comments (
				post_id,
				user_id,
				role,
				text
			)
		VALUES
			(
				@post_id,
				@user_id,
				@role,
				@text
			)
		RETURNING
		*
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"post_id": payload.ID,
		"user_id": userID,
		"role":    role,
		"text":    payload.Text,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute create comment query for post_id=%s user_id=%s: %w",
			payload.ID.String(), userID, err)
	}

	commentItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[comment.Comment])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:comments for post_id=%s user_id=%s: %w",
			payload.ID.String(), userID, err)
	}

	return &commentItem, nil
}

// GetCommentsByPostID returns one page of a post's comments, oldest first (GET /posts/:id/comments).
// query must have been through Validate, which fills page and limit. Comments are public.
// No comments (or no such post) -> empty page; the service calls CheckPostExists for the 404.
func (r *CommentRepository) GetCommentsByPostID(ctx context.Context,
	query *comment.GetCommentsQuery,
) (*model.PaginatedResponse[comment.Comment], error) {
	stmt := `
		SELECT
			*
		FROM
			comments
		WHERE
			post_id = @post_id
		ORDER BY
			created_at ASC,
			id ASC
		LIMIT
			@limit
		OFFSET
			@offset
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"post_id": query.ID,
		"limit":   query.Limit,
		"offset":  (query.Page - 1) * query.Limit,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute get comments by post id query for post_id=%s: %w", query.ID.String(), err)
	}

	comments, err := pgx.CollectRows(rows, pgx.RowToStructByName[comment.Comment])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows from table:comments for post_id=%s: %w", query.ID.String(), err)
	}

	var total int
	err = r.server.DB.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*)
		FROM
			comments
		WHERE
			post_id = @post_id
	`, pgx.NamedArgs{
		"post_id": query.ID,
	}).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count of comments for post_id=%s: %w", query.ID.String(), err)
	}

	return &model.PaginatedResponse[comment.Comment]{
		Data:       comments,
		Page:       query.Page,
		Limit:      query.Limit,
		Total:      total,
		TotalPages: (total + query.Limit - 1) / query.Limit,
	}, nil
}

// GetCommentByID returns one comment of one post, for the delete check (author or admin).
// Matching post_id too means /posts/A/comments/<a comment of post B> is a 404.
// No such comment -> pgx.ErrNoRows (wrapped) -> 404.
func (r *CommentRepository) GetCommentByID(ctx context.Context, postID uuid.UUID,
	commentID uuid.UUID,
) (*comment.Comment, error) {
	stmt := `
		SELECT
			*
		FROM
			comments
		WHERE
			id = @id
			AND post_id = @post_id
	`

	rows, err := r.server.DB.Pool.Query(ctx, stmt, pgx.NamedArgs{
		"id":      commentID,
		"post_id": postID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute get comment by id query for comment_id=%s post_id=%s: %w",
			commentID.String(), postID.String(), err)
	}

	commentItem, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[comment.Comment])
	if err != nil {
		return nil, fmt.Errorf("failed to collect row from table:comments for comment_id=%s post_id=%s: %w",
			commentID.String(), postID.String(), err)
	}

	return &commentItem, nil
}

// DeleteComment deletes one comment of one post. Who may delete is checked in the service.
// No such comment -> 404 COMMENT_NOT_FOUND.
func (r *CommentRepository) DeleteComment(ctx context.Context, postID uuid.UUID, commentID uuid.UUID) error {
	result, err := r.server.DB.Pool.Exec(ctx, `
		DELETE FROM comments
		WHERE
			id = @id
			AND post_id = @post_id
	`, pgx.NamedArgs{
		"id":      commentID,
		"post_id": postID,
	})
	if err != nil {
		return fmt.Errorf("failed to execute delete comment query for comment_id=%s post_id=%s: %w",
			commentID.String(), postID.String(), err)
	}

	if result.RowsAffected() == 0 {
		code := "COMMENT_NOT_FOUND"
		return errs.NewNotFoundError("comment not found", false, &code)
	}

	return nil
}
