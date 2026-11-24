package user

import (
	"github.com/go-playground/validator/v10"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// validate is shared by all DTOs here; it caches struct rules.
var validate = validator.New() //nolint:gochecknoglobals // shared on purpose

// =============================================================
// GetMePayload  ->  GET /me
// =============================================================

// GetMePayload has no fields.
type GetMePayload struct{}

// Validate always succeeds.
func (p *GetMePayload) Validate() error { return nil }

// =============================================================
// OnboardPayload  ->  POST /me/onboarding
// =============================================================

// OnboardPayload is the role and profile picked after Clerk sign-up.
type OnboardPayload struct {
	Role Role `json:"role" validate:"required,oneof=citizen authority admin"`

	Address string `json:"address" validate:"required_if=Role citizen,max=500"`

	Phone      string               `json:"phone" validate:"required_if=Role authority,max=15"`
	Department Department           `json:"department" validate:"required_if=Role authority,omitempty,oneof=water electricity road sanitation other"` //nolint:lll // a struct tag cannot be split across lines
	Zone       string               `json:"zone" validate:"required_if=Role authority,max=100"`
	Location   *model.LocationInput `json:"location" validate:"required_if=Role authority"`
}

// Validate checks the role and its profile fields.
func (p *OnboardPayload) Validate() error {
	return validate.Struct(p)
}

// =============================================================
// UpdateMePayload  ->  PATCH /me
// =============================================================

// UpdateMePayload has only optional fields; nil = don't change.
type UpdateMePayload struct {
	Name *string `json:"name" validate:"omitempty,max=100"`

	Address *string `json:"address" validate:"omitempty,max=500"`

	Phone      *string     `json:"phone" validate:"omitempty,max=15"`
	Department *Department `json:"department" validate:"omitempty,oneof=water electricity road sanitation other"`
	Zone       *string     `json:"zone" validate:"omitempty,max=100"`
}

// Validate checks the fields that were sent.
func (p *UpdateMePayload) Validate() error {
	return validate.Struct(p)
}

// =============================================================
// UpdateLocationPayload  ->  PATCH /me/location
// =============================================================

// UpdateLocationPayload sets an authority's location.
type UpdateLocationPayload struct {
	Location *model.LocationInput `json:"location" validate:"required"`
}

// Validate checks the coordinates.
func (p *UpdateLocationPayload) Validate() error {
	return validate.Struct(p)
}

// =============================================================
// GetAuthoritiesQuery  ->  GET /admin/authorities
// =============================================================

// GetAuthoritiesQuery is paging plus optional filters.
type GetAuthoritiesQuery struct {
	Page       *int        `query:"page" validate:"omitempty,min=1"`
	Limit      *int        `query:"limit" validate:"omitempty,min=1,max=100"`
	Department *Department `query:"department" validate:"omitempty,oneof=water electricity road sanitation other"`
	Zone       *string     `query:"zone" validate:"omitempty,max=100"`
	Verified   *bool       `query:"verified" validate:"omitempty"`
}

// Validate checks the filters and defaults page/limit.
func (q *GetAuthoritiesQuery) Validate() error {
	if err := validate.Struct(q); err != nil {
		return err
	}

	if q.Page == nil {
		defaultPage := 1
		q.Page = &defaultPage
	}

	if q.Limit == nil {
		defaultLimit := 20
		q.Limit = &defaultLimit
	}

	return nil
}

// =============================================================
// VerifyAuthorityPayload  ->  PATCH /admin/authorities/:id/verify
// =============================================================

// VerifyAuthorityPayload (un)verifies an authority. *bool so false passes required.
type VerifyAuthorityPayload struct {
	ID         string `param:"id" validate:"required,startswith=user_,max=64"`
	IsVerified *bool  `json:"isVerified" validate:"required"`
}

// Validate checks the id and isVerified.
func (p *VerifyAuthorityPayload) Validate() error {
	return validate.Struct(p)
}

// =============================================================
// PromoteUserPayload  ->  POST /admin/users/:id/promote
// =============================================================

// PromoteUserPayload makes a user an admin.
type PromoteUserPayload struct {
	ID string `param:"id" validate:"required,startswith=user_,max=64"`
}

// Validate checks the Clerk user id.
func (p *PromoteUserPayload) Validate() error {
	return validate.Struct(p)
}
