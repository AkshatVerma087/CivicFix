package model

import "github.com/go-playground/validator/v10"

var validate = validator.New()

// LocationInput uses pointers so that 0 is a valid coordinate but a missing one is not.
type LocationInput struct {
	Latitude  *float64 `json:"latitude" validate:"required,gte=-90,lte=90"`
	Longitude *float64 `json:"longitude" validate:"required,gte=-180,lte=180"`
}

func (l *LocationInput) GeoPoint() *GeoPoint {
	if l == nil || l.Latitude == nil || l.Longitude == nil {
		return nil
	}
	return &GeoPoint{Latitude: *l.Latitude, Longitude: *l.Longitude}
}

// GetMeRequest has no input; it exists to fit the typed handler.
type GetMeRequest struct{}

func (r *GetMeRequest) Validate() error { return nil }

// OnboardRequest is sent once after Clerk sign-up to pick a role and fill in the profile.
// Role "admin" is only accepted for emails on CIVICFIX_AUTH.BOOTSTRAP_ADMIN_EMAILS.
type OnboardRequest struct {
	Role Role `json:"role" validate:"required,oneof=citizen authority admin"`

	// citizen
	Address string `json:"address" validate:"required_if=Role citizen,max=500"`

	// authority
	Phone      string         `json:"phone" validate:"required_if=Role authority,max=30"`
	Department string         `json:"department" validate:"required_if=Role authority,omitempty,oneof=water electricity road sanitation other"`
	Zone       string         `json:"zone" validate:"required_if=Role authority,max=100"`
	Location   *LocationInput `json:"location" validate:"omitempty"`
}

func (r *OnboardRequest) Validate() error { return validate.Struct(r) }

// UpdateLocationRequest updates the signed-in authority's location.
type UpdateLocationRequest struct {
	LocationInput
}

func (r *UpdateLocationRequest) Validate() error { return validate.Struct(r) }

// PromoteUserRequest makes an existing user an admin.
type PromoteUserRequest struct {
	ID string `param:"id" validate:"required,startswith=user_,max=64"`
}

func (r *PromoteUserRequest) Validate() error { return validate.Struct(r) }
