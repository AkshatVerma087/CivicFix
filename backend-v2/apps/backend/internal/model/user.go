package model

import "time"

type Role string

const (
	RoleCitizen   Role = "citizen"
	RoleAuthority Role = "authority"
	RoleAdmin     Role = "admin"
)

func (r Role) Valid() bool {
	return r == RoleCitizen || r == RoleAuthority || r == RoleAdmin
}

// User is the app-side record for a Clerk user. ID is the Clerk user id.
type User struct {
	ID        string    `json:"id" db:"id"`
	Role      Role      `json:"role" db:"role"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`

	Citizen   *CitizenProfile   `json:"citizen,omitempty"`
	Authority *AuthorityProfile `json:"authority,omitempty"`
}

type CitizenProfile struct {
	Address string `json:"address" db:"address"`
}

type AuthorityProfile struct {
	Phone      string    `json:"phone" db:"phone"`
	Department string    `json:"department" db:"department"`
	Zone       string    `json:"zone" db:"zone"`
	Location   *GeoPoint `json:"location"`
	IsVerified bool      `json:"isVerified" db:"is_verified"`
}

// GeoPoint matches the {latitude, longitude} shape the frontend already uses.
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Me is the response for the current user. Onboarded is false until the user
// has picked a role and filled in their profile.
type Me struct {
	Onboarded bool  `json:"onboarded"`
	User      *User `json:"user,omitempty"`
	// Only set before onboarding: whether this user's email is on the admin allow-list.
	AdminEligible bool `json:"adminEligible,omitempty"`
}
