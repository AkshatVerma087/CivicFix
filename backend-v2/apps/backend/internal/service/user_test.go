package service

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/AkshatVerma087/go-civicfix/internal/errs"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/repository"
	testingpkg "github.com/AkshatVerma087/go-civicfix/internal/testing"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/stretchr/testify/require"
)

type fakeClerk struct {
	users   map[string]*clerk.User
	roles   map[string]model.Role
	failSet bool
}

func (f *fakeClerk) Get(_ context.Context, id string) (*clerk.User, error) {
	if u, ok := f.users[id]; ok {
		return u, nil
	}
	return nil, errors.New("not found")
}

func (f *fakeClerk) SetRole(_ context.Context, id string, role model.Role) error {
	if f.failSet {
		return errors.New("clerk down")
	}
	f.roles[id] = role
	return nil
}

func clerkUser(id, email string, verified bool, first string) *clerk.User {
	status := "unverified"
	if verified {
		status = "verified"
	}
	emailID := "idn_" + id
	return &clerk.User{
		ID:                    id,
		FirstName:             &first,
		PrimaryEmailAddressID: &emailID,
		EmailAddresses: []*clerk.EmailAddress{{
			ID: emailID, EmailAddress: email, Verification: &clerk.Verification{Status: status},
		}},
	}
}

func ptr[T any](v T) *T { return &v }

func httpStatus(t *testing.T, err error) int {
	t.Helper()
	var httpErr *errs.HTTPError
	require.True(t, errors.As(err, &httpErr), "expected HTTPError, got %v", err)
	return httpErr.Status
}

func TestUserService(t *testing.T) {
	_, srv, cleanup := testingpkg.SetupTest(t)
	defer cleanup()
	srv.Config.Auth.BootstrapAdminEmails = []string{"Boss@Example.com"}

	fc := &fakeClerk{
		users: map[string]*clerk.User{
			"user_citizen":    clerkUser("user_citizen", "cit@example.com", true, "Asha"),
			"user_authority":  clerkUser("user_authority", "auth@example.com", true, "Ravi"),
			"user_boss":       clerkUser("user_boss", "boss@example.com", true, "Boss"),
			"user_wannabe":    clerkUser("user_wannabe", "wannabe@example.com", true, "W"),
			"user_unverified": clerkUser("user_unverified", "u@example.com", false, "U"),
			"user_rollback":   clerkUser("user_rollback", "rb@example.com", true, "R"),
		},
		roles: map[string]model.Role{},
	}
	svc := &UserService{server: srv, repo: repository.NewUserRepository(srv), clerk: fc}
	ctx := context.Background()

	t.Run("not onboarded yet", func(t *testing.T) {
		me, err := svc.Me(ctx, "user_citizen")
		require.NoError(t, err)
		require.False(t, me.Onboarded)
		require.False(t, me.AdminEligible)

		boss, err := svc.Me(ctx, "user_boss")
		require.NoError(t, err)
		require.True(t, boss.AdminEligible, "allow-list match should be case-insensitive")
	})

	t.Run("citizen onboarding", func(t *testing.T) {
		me, err := svc.Onboard(ctx, "user_citizen", &model.OnboardRequest{Role: model.RoleCitizen, Address: "  12 MG Road  "})
		require.NoError(t, err)
		require.True(t, me.Onboarded)
		require.Equal(t, model.RoleCitizen, me.User.Role)
		require.Equal(t, "Asha", me.User.Name)
		require.Equal(t, "cit@example.com", me.User.Email)
		require.Equal(t, "12 MG Road", me.User.Citizen.Address)
		require.Nil(t, me.User.Authority)
		require.Equal(t, model.RoleCitizen, fc.roles["user_citizen"])
	})

	t.Run("second onboarding is a conflict", func(t *testing.T) {
		_, err := svc.Onboard(ctx, "user_citizen", &model.OnboardRequest{Role: model.RoleAuthority})
		require.Equal(t, http.StatusConflict, httpStatus(t, err))
	})

	t.Run("authority onboarding with location, then location update", func(t *testing.T) {
		me, err := svc.Onboard(ctx, "user_authority", &model.OnboardRequest{
			Role: model.RoleAuthority, Phone: "9999999999", Department: "water", Zone: "Ward 5",
			Location: &model.LocationInput{Latitude: ptr(28.6), Longitude: ptr(77.2)},
		})
		require.NoError(t, err)
		a := me.User.Authority
		require.NotNil(t, a)
		require.Equal(t, "water", a.Department)
		require.False(t, a.IsVerified)
		require.Equal(t, &model.GeoPoint{Latitude: 28.6, Longitude: 77.2}, a.Location)

		me, err = svc.UpdateLocation(ctx, "user_authority", model.GeoPoint{Latitude: 0, Longitude: -10.5})
		require.NoError(t, err)
		require.Equal(t, &model.GeoPoint{Latitude: 0, Longitude: -10.5}, me.User.Authority.Location)

		_, err = svc.UpdateLocation(ctx, "user_citizen", model.GeoPoint{Latitude: 1, Longitude: 1})
		require.Equal(t, http.StatusNotFound, httpStatus(t, err))
	})

	t.Run("admin onboarding needs allow-list", func(t *testing.T) {
		_, err := svc.Onboard(ctx, "user_wannabe", &model.OnboardRequest{Role: model.RoleAdmin})
		require.Equal(t, http.StatusForbidden, httpStatus(t, err))

		me, err := svc.Onboard(ctx, "user_boss", &model.OnboardRequest{Role: model.RoleAdmin})
		require.NoError(t, err)
		require.Equal(t, model.RoleAdmin, me.User.Role)
		require.Equal(t, model.RoleAdmin, fc.roles["user_boss"])
	})

	t.Run("unverified email is rejected", func(t *testing.T) {
		_, err := svc.Onboard(ctx, "user_unverified", &model.OnboardRequest{Role: model.RoleCitizen, Address: "x"})
		require.Equal(t, http.StatusBadRequest, httpStatus(t, err))
	})

	t.Run("clerk failure rolls back the database insert", func(t *testing.T) {
		fc.failSet = true
		_, err := svc.Onboard(ctx, "user_rollback", &model.OnboardRequest{Role: model.RoleCitizen, Address: "x"})
		fc.failSet = false
		require.Error(t, err)

		me, err := svc.Me(ctx, "user_rollback")
		require.NoError(t, err)
		require.False(t, me.Onboarded)
	})

	t.Run("promote to admin", func(t *testing.T) {
		u, err := svc.PromoteToAdmin(ctx, "user_authority")
		require.NoError(t, err)
		require.Equal(t, model.RoleAdmin, u.Role)
		require.NotNil(t, u.Authority, "profile is kept")
		require.Equal(t, model.RoleAdmin, fc.roles["user_authority"])

		_, err = svc.PromoteToAdmin(ctx, "user_nobody")
		require.Equal(t, http.StatusNotFound, httpStatus(t, err))
	})
}
