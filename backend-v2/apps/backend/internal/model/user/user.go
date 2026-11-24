package user

import (
	"time"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// ------------------------------------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------------------------------------

type Role string

const (
	RoleCitizen   Role = "citizen"
	RoleAuthority Role = "authority"
	RoleAdmin     Role = "admin"
)

func (r Role) Valid() bool {
	return r == RoleAdmin || r == RoleAuthority || r == RoleCitizen
}

type Department string

const (
	DepartmentWater       Department = "water"
	DepartmentElectricity Department = "electricity"
	DepartmentRoad        Department = "road"
	DepartmentSanitation  Department = "sanitation"
	DepartmentOther       Department = "other"
)

func (d Department) Valid() bool {
	return d == DepartmentWater || d == DepartmentElectricity || d == DepartmentRoad || d == DepartmentSanitation || d == DepartmentOther
}

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------

type User struct {
	ID        string    `json:"id" db:"id"`
	Role      Role      `json:"role" db:"role"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CitizenProfile struct {
	Address string `json:"address" db:"address"`
}

type AuthorityProfile struct {
	Phone      string          `json:"phone" db:"phone"`
	Department Department      `json:"department" db:"department"`
	Zone       string          `json:"zone" db:"zone"`
	Location   *model.GeoPoint `json:"location"`
	IsVerified bool            `json:"is_verified" db:"is_verified"`
}

// ---------------------------------------------------------------------------------
// Responses
// -----------------------------------------------------------------------------------

type PopulatedUser struct {
	User
	Citizen   *CitizenProfile   `json:"citizen_profile,omitempty"`
	Authority *AuthorityProfile `json:"authority_profile,omitempty"`
}

type PublicUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role Role   `json:"role"`
}

func (u *User) Public() PublicUser {
	return PublicUser{ID: u.ID, Name: u.Name, Role: u.Role}
}

func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}
