package user_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/model/user"
)

func ptr[T any](v T) *T { return &v }

func TestOnboardPayload_Validate(t *testing.T) {
	tests := []struct {
		name    string
		payload user.OnboardPayload
		wantErr bool
	}{
		{
			name:    "valid citizen",
			payload: user.OnboardPayload{Role: user.RoleCitizen, Address: "12 MG Road"},
		},
		{
			name:    "citizen without address",
			payload: user.OnboardPayload{Role: user.RoleCitizen},
			wantErr: true,
		},
		{
			name: "valid authority",
			payload: user.OnboardPayload{
				Role: user.RoleAuthority, Phone: "9876543210", Department: user.DepartmentWater, Zone: "Ward 5",
				Location: &model.LocationInput{Latitude: ptr(28.6), Longitude: ptr(77.2)},
			},
		},
		{
			name:    "authority without phone",
			payload: user.OnboardPayload{Role: user.RoleAuthority, Department: user.DepartmentRoad, Zone: "Ward 5"},
			wantErr: true,
		},
		{
			name: "authority with unknown department",
			payload: user.OnboardPayload{
				Role: user.RoleAuthority, Phone: "9876543210", Department: "parks", Zone: "Ward 5",
			},
			wantErr: true,
		},
		{
			name:    "unknown role",
			payload: user.OnboardPayload{Role: "mayor"},
			wantErr: true,
		},
		{
			name: "location at the equator (0,0) is valid",
			payload: user.OnboardPayload{
				Role: user.RoleCitizen, Address: "x",
				Location: &model.LocationInput{Latitude: ptr(0.0), Longitude: ptr(0.0)},
			},
		},
		{
			name: "location with latitude out of range",
			payload: user.OnboardPayload{
				Role: user.RoleCitizen, Address: "x",
				Location: &model.LocationInput{Latitude: ptr(91.0), Longitude: ptr(10.0)},
			},
			wantErr: true,
		},
		{
			name: "location missing longitude",
			payload: user.OnboardPayload{
				Role: user.RoleCitizen, Address: "x",
				Location: &model.LocationInput{Latitude: ptr(10.0)},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.payload.Validate()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestGetAuthoritiesQuery_Defaults(t *testing.T) {
	q := user.GetAuthoritiesQuery{}
	require.NoError(t, q.Validate())
	require.Equal(t, 1, *q.Page)
	require.Equal(t, 20, *q.Limit)
}

func TestVerifyAuthorityPayload_FalseIsAllowed(t *testing.T) {
	p := user.VerifyAuthorityPayload{ID: "user_abc", IsVerified: ptr(false)}
	require.NoError(t, p.Validate())
}
