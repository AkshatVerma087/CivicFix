package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrUserNotFound is returned when no users row exists for an id.
var ErrUserNotFound = errors.New("user not found")

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(s *server.Server) *UserRepository {
	return &UserRepository{pool: s.DB.Pool}
}

// GetByID loads a user with whichever profile matches their role.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	const q = `
		SELECT u.id, u.role, u.name, u.email, u.created_at, u.updated_at,
		       c.address,
		       a.phone, a.department, a.zone, a.latitude, a.longitude, a.is_verified
		FROM users u
		LEFT JOIN citizen_profiles c ON c.user_id = u.id
		LEFT JOIN authority_profiles a ON a.user_id = u.id
		WHERE u.id = $1`

	var (
		u                       model.User
		address                 *string
		phone, department, zone *string
		lat, lng                *float64
		verified                *bool
	)
	err := r.pool.QueryRow(ctx, q, id).Scan(
		&u.ID, &u.Role, &u.Name, &u.Email, &u.CreatedAt, &u.UpdatedAt,
		&address,
		&phone, &department, &zone, &lat, &lng, &verified,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user %s: %w", id, err)
	}

	if address != nil {
		u.Citizen = &model.CitizenProfile{Address: *address}
	}
	if phone != nil {
		a := &model.AuthorityProfile{Phone: *phone, Department: *department, Zone: *zone, IsVerified: *verified}
		if lat != nil && lng != nil {
			a.Location = &model.GeoPoint{Latitude: *lat, Longitude: *lng}
		}
		u.Authority = a
	}
	return &u, nil
}

// CreateUserParams holds everything needed to create a user and their profile in one go.
type CreateUserParams struct {
	ID        string
	Role      model.Role
	Name      string
	Email     string
	Citizen   *model.CitizenProfile
	Authority *model.AuthorityProfile
}

// CreateWithProfile inserts the user and profile inside tx. The caller commits.
func (r *UserRepository) CreateWithProfile(ctx context.Context, tx pgx.Tx, p CreateUserParams) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO users (id, role, name, email) VALUES ($1, $2, $3, $4)`,
		p.ID, p.Role, p.Name, p.Email)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}

	if p.Citizen != nil {
		if _, err := tx.Exec(ctx,
			`INSERT INTO citizen_profiles (user_id, address) VALUES ($1, $2)`,
			p.ID, p.Citizen.Address); err != nil {
			return fmt.Errorf("insert citizen profile: %w", err)
		}
	}

	if p.Authority != nil {
		var lat, lng *float64
		if p.Authority.Location != nil {
			lat, lng = &p.Authority.Location.Latitude, &p.Authority.Location.Longitude
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO authority_profiles (user_id, phone, department, zone, latitude, longitude)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			p.ID, p.Authority.Phone, p.Authority.Department, p.Authority.Zone, lat, lng); err != nil {
			return fmt.Errorf("insert authority profile: %w", err)
		}
	}
	return nil
}

// SetRole changes a user's role inside tx. Returns ErrUserNotFound if there is no such user.
func (r *UserRepository) SetRole(ctx context.Context, tx pgx.Tx, id string, role model.Role) error {
	tag, err := tx.Exec(ctx, `UPDATE users SET role = $2 WHERE id = $1`, id, role)
	if err != nil {
		return fmt.Errorf("set role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdateAuthorityLocation sets an authority's location. Returns ErrUserNotFound if they have no authority profile.
func (r *UserRepository) UpdateAuthorityLocation(ctx context.Context, id string, loc model.GeoPoint) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE authority_profiles SET latitude = $2, longitude = $3 WHERE user_id = $1`,
		id, loc.Latitude, loc.Longitude)
	if err != nil {
		return fmt.Errorf("update authority location: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// BeginTx starts a transaction on the pool.
func (r *UserRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}
