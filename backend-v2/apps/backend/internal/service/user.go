package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/AkshatVerma087/go-civicfix/internal/errs"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/repository"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
	"github.com/clerk/clerk-sdk-go/v2"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
)

// ClerkUsers is the part of the Clerk API the user service needs (swappable in tests).
type ClerkUsers interface {
	Get(ctx context.Context, id string) (*clerk.User, error)
	SetRole(ctx context.Context, id string, role model.Role) error
}

type clerkUsersAPI struct{}

func (clerkUsersAPI) Get(ctx context.Context, id string) (*clerk.User, error) {
	return clerkuser.Get(ctx, id)
}

// SetRole stores the role in Clerk publicMetadata, which the session token exposes as the "role" claim.
func (clerkUsersAPI) SetRole(ctx context.Context, id string, role model.Role) error {
	meta := json.RawMessage(fmt.Sprintf(`{"role":%q}`, role))
	_, err := clerkuser.UpdateMetadata(ctx, id, &clerkuser.UpdateMetadataParams{PublicMetadata: &meta})
	return err
}

type UserService struct {
	server *server.Server
	repo   *repository.UserRepository
	clerk  ClerkUsers
}

func NewUserService(s *server.Server, repo *repository.UserRepository) *UserService {
	return &UserService{server: s, repo: repo, clerk: clerkUsersAPI{}}
}

// Me returns the signed-in user's record, or Onboarded=false if they haven't onboarded yet.
func (s *UserService) Me(ctx context.Context, userID string) (*model.Me, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if errors.Is(err, repository.ErrUserNotFound) {
		me := &model.Me{Onboarded: false}
		// Let the onboarding screen offer "admin" only to allow-listed emails.
		if cu, err := s.clerk.Get(ctx, userID); err == nil {
			if email := verifiedPrimaryEmail(cu); email != "" {
				me.AdminEligible = s.server.Config.Auth.IsBootstrapAdmin(email)
			}
		}
		return me, nil
	}
	if err != nil {
		return nil, err
	}
	return &model.Me{Onboarded: true, User: u}, nil
}

// Onboard creates the user's record with their chosen role and profile, then
// writes the role to Clerk. Both happen or neither does.
func (s *UserService) Onboard(ctx context.Context, userID string, req *model.OnboardRequest) (*model.Me, error) {
	if _, err := s.repo.GetByID(ctx, userID); err == nil {
		code := "USER_ALREADY_ONBOARDED"
		return nil, errs.NewConflictError("You have already completed onboarding", true, &code)
	} else if !errors.Is(err, repository.ErrUserNotFound) {
		return nil, err
	}

	cu, err := s.clerk.Get(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch clerk user: %w", err)
	}
	email := verifiedPrimaryEmail(cu)
	if email == "" {
		code := "EMAIL_NOT_VERIFIED"
		return nil, errs.NewBadRequestError("Please verify your email address first", true, &code, nil, nil)
	}

	params := repository.CreateUserParams{
		ID:    userID,
		Role:  req.Role,
		Name:  displayName(cu, email),
		Email: email,
	}

	switch req.Role {
	case model.RoleAdmin:
		if !s.server.Config.Auth.IsBootstrapAdmin(email) {
			return nil, errs.NewForbiddenError("You can't register as an admin", true)
		}
	case model.RoleCitizen:
		params.Citizen = &model.CitizenProfile{Address: strings.TrimSpace(req.Address)}
	case model.RoleAuthority:
		params.Authority = &model.AuthorityProfile{
			Phone:      strings.TrimSpace(req.Phone),
			Department: req.Department,
			Zone:       strings.TrimSpace(req.Zone),
			Location:   req.Location.GeoPoint(),
		}
	}

	tx, err := s.repo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	if err := s.repo.CreateWithProfile(ctx, tx, params); err != nil {
		return nil, err
	}
	if err := s.clerk.SetRole(ctx, userID, req.Role); err != nil {
		return nil, fmt.Errorf("set clerk role: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.Me(ctx, userID)
}

// UpdateLocation sets the signed-in authority's location.
func (s *UserService) UpdateLocation(ctx context.Context, userID string, loc model.GeoPoint) (*model.Me, error) {
	if err := s.repo.UpdateAuthorityLocation(ctx, userID, loc); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, errs.NewNotFoundError("Authority profile not found", true, nil)
		}
		return nil, err
	}
	return s.Me(ctx, userID)
}

// PromoteToAdmin makes an existing (onboarded) user an admin, in Postgres and in Clerk.
// Their existing profile is kept.
func (s *UserService) PromoteToAdmin(ctx context.Context, targetID string) (*model.User, error) {
	tx, err := s.repo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	if err := s.repo.SetRole(ctx, tx, targetID, model.RoleAdmin); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, errs.NewNotFoundError("User not found (they must finish onboarding first)", true, nil)
		}
		return nil, err
	}
	if err := s.clerk.SetRole(ctx, targetID, model.RoleAdmin); err != nil {
		return nil, fmt.Errorf("set clerk role: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, targetID)
}

func verifiedPrimaryEmail(u *clerk.User) string {
	if u == nil || u.PrimaryEmailAddressID == nil {
		return ""
	}
	for _, e := range u.EmailAddresses {
		if e != nil && e.ID == *u.PrimaryEmailAddressID &&
			e.Verification != nil && e.Verification.Status == "verified" {
			return e.EmailAddress
		}
	}
	return ""
}

func displayName(u *clerk.User, email string) string {
	var parts []string
	if u.FirstName != nil && *u.FirstName != "" {
		parts = append(parts, *u.FirstName)
	}
	if u.LastName != nil && *u.LastName != "" {
		parts = append(parts, *u.LastName)
	}
	if len(parts) > 0 {
		return strings.Join(parts, " ")
	}
	if u.Username != nil && *u.Username != "" {
		return *u.Username
	}
	return strings.Split(email, "@")[0]
}
