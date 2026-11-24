package model

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func f(v float64) *float64 { return &v }

func TestOnboardRequestValidate(t *testing.T) {
	cases := []struct {
		name  string
		req   OnboardRequest
		valid bool
	}{
		{"citizen ok", OnboardRequest{Role: RoleCitizen, Address: "12 MG Road"}, true},
		{"citizen missing address", OnboardRequest{Role: RoleCitizen}, false},
		{"authority ok", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "road", Zone: "5"}, true},
		{"authority bad department", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "fire", Zone: "5"}, false},
		{"authority missing zone", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "road"}, false},
		{"authority with location", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "road", Zone: "5",
			Location: &LocationInput{Latitude: f(0), Longitude: f(0)}}, true},
		{"authority bad latitude", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "road", Zone: "5",
			Location: &LocationInput{Latitude: f(91), Longitude: f(0)}}, false},
		{"authority half location", OnboardRequest{Role: RoleAuthority, Phone: "1", Department: "road", Zone: "5",
			Location: &LocationInput{Latitude: f(10)}}, false},
		{"admin needs no profile", OnboardRequest{Role: RoleAdmin}, true},
		{"unknown role", OnboardRequest{Role: "mayor"}, false},
		{"missing role", OnboardRequest{}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.req.Validate()
			if tc.valid {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
			}
		})
	}
}

func TestUpdateLocationRequestValidate(t *testing.T) {
	require.NoError(t, (&UpdateLocationRequest{LocationInput{Latitude: f(0), Longitude: f(0)}}).Validate())
	require.Error(t, (&UpdateLocationRequest{}).Validate())
	require.Error(t, (&UpdateLocationRequest{LocationInput{Latitude: f(0), Longitude: f(181)}}).Validate())
}

func TestPromoteUserRequestValidate(t *testing.T) {
	require.NoError(t, (&PromoteUserRequest{ID: "user_2abc"}).Validate())
	require.Error(t, (&PromoteUserRequest{ID: "2abc"}).Validate())
	require.Error(t, (&PromoteUserRequest{}).Validate())
}
