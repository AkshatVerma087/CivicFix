package user

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

func ptr[T any](v T) *T { return &v }

func TestOnboardPayload_Validate(t *testing.T) {
	tests := []struct {
		name    string
		payload OnboardPayload
		wantErr bool
	}{
		{
			name:    "valid citizen",
			payload: OnboardPayload{Role: RoleCitizen, Address: "12 MG Road"},
		},
		{
			name:    "citizen without address",
			payload: OnboardPayload{Role: RoleCitizen},
			wantErr: true,
		},
		{
			name: "valid authority",
			payload: OnboardPayload{
				Role: RoleAuthority, Phone: "9876543210", Department: DepartmentWater, Zone: "Ward 5",
				Location: &model.LocationInput{Latitude: ptr(28.6), Longitude: ptr(77.2)},
			},
		},
		{
			name:    "authority without phone",
			payload: OnboardPayload{Role: RoleAuthority, Department: DepartmentRoad, Zone: "Ward 5"},
			wantErr: true,
		},
		{
			name: "authority with unknown department",
			payload: OnboardPayload{
				Role: RoleAuthority, Phone: "9876543210", Department: "parks", Zone: "Ward 5",
			},
			wantErr: true,
		},
		{
			name:    "unknown role",
			payload: OnboardPayload{Role: "mayor"},
			wantErr: true,
		},
		{
			name: "location at the equator (0,0) is valid",
			payload: OnboardPayload{
				Role: RoleCitizen, Address: "x",
				Location: &model.LocationInput{Latitude: ptr(0.0), Longitude: ptr(0.0)},
			},
		},
		{
			name: "location with latitude out of range",
			payload: OnboardPayload{
				Role: RoleCitizen, Address: "x",
				Location: &model.LocationInput{Latitude: ptr(91.0), Longitude: ptr(10.0)},
			},
			wantErr: true,
		},
		{
			name: "location missing longitude",
			payload: OnboardPayload{
				Role: RoleCitizen, Address: "x",
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
	q := GetAuthoritiesQuery{}
	require.NoError(t, q.Validate())
	require.Equal(t, 1, *q.Page)
	require.Equal(t, 20, *q.Limit)
}

func TestVerifyAuthorityPayload_FalseIsAllowed(t *testing.T) {
	p := VerifyAuthorityPayload{ID: "user_abc", IsVerified: ptr(false)}
	require.NoError(t, p.Validate())
}
