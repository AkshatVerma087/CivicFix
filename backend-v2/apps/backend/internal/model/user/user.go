// Package user holds the user models and DTOs.
package user

import (
	"time"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// ------------------------------------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------------------------------------

// =============================================================
// Role
// =============================================================

// Role is a user's role (matches the users.role CHECK).
type Role string

// Roles a user can have.
const (
	RoleCitizen   Role = "citizen"
	RoleAuthority Role = "authority"
	RoleAdmin     Role = "admin"
)

// Valid reports whether r is one of the allowed roles.
func (r Role) Valid() bool {
	return r == RoleAdmin || r == RoleAuthority || r == RoleCitizen
}

// =============================================================
// Department
// =============================================================

// Department is an authority's area of work.
type Department string

// Departments an authority can belong to.
const (
	DepartmentWater       Department = "water"
	DepartmentElectricity Department = "electricity"
	DepartmentRoad        Department = "road"
	DepartmentSanitation  Department = "sanitation"
	DepartmentOther       Department = "other"
)

// Valid reports whether d is an allowed department.
func (d Department) Valid() bool {
	switch d {
	case DepartmentWater, DepartmentElectricity, DepartmentRoad, DepartmentSanitation, DepartmentOther:
		return true
	}
	return false
}

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------

// =============================================================
// User
// =============================================================

// User is a row in users. ID is the Clerk user id.
type User struct {
	ID        string    `json:"id" db:"id"`
	Role      Role      `json:"role" db:"role"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// =============================================================
// CitizenProfile
// =============================================================

// CitizenProfile is a row in citizen_profiles.
type CitizenProfile struct {
	Address string `json:"address" db:"address"`
}

// =============================================================
// AuthorityProfile
// =============================================================

// AuthorityProfile is a row in authority_profiles.
type AuthorityProfile struct {
	Phone      string          `json:"phone" db:"phone"`
	Department Department      `json:"department" db:"department"`
	Zone       string          `json:"zone" db:"zone"`
	Location   *model.GeoPoint `json:"location"`
	IsVerified bool            `json:"isVerified" db:"is_verified"`
}

// ---------------------------------------------------------------------------------
// Responses
// -----------------------------------------------------------------------------------

// =============================================================
// PopulatedUser
// =============================================================

// PopulatedUser is a user with their role's profile.
type PopulatedUser struct {
	User
	Citizen   *CitizenProfile   `json:"citizenProfile,omitempty"`
	Authority *AuthorityProfile `json:"authorityProfile,omitempty"`
}

// =============================================================
// PublicUser
// =============================================================

// PublicUser is what other users may see.
type PublicUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role Role   `json:"role"`
}

// Public returns u's public fields.
func (u *User) Public() PublicUser {
	return PublicUser{ID: u.ID, Name: u.Name, Role: u.Role}
}

// IsAdmin reports whether u has the admin role.
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}
