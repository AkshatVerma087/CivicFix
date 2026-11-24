package user

import (
	"github.com/go-playground/validator/v10"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

// One validator for the whole package
var validate = validator.New()

// -------------------------------------------------------------------
// GET /me
// ------------------------------------------------------------------

type GetMePayload struct{}

func (p *GetMePayload) Validate() error { return nil }

// ---------------------------------------------------------------------
// // POST /me/onboarding: sent once after clerk sign up to complete the onboarding process
// ---------------------------------------------------------------------

type OnboardPayload struct {
	Role Role `json:"role" validate:"required,oneof=citizen authority admin"`

	Address string `json:"address" validate:"required_if=Role citizen,max=500"`

	Phone      string               `json:"phone" validate:"required_if=Role authority,max=15"`
	Department Department           `json:"department" validate:"required_if=Role authority,omitempty,oneof=water electricity road sanitation other"`
	Zone       string               `json:"zone" validate:"required_if=Role authority,max=100"`
	Location   *model.LocationInput `json:"location" validate:"required_if=Role authority"`
}

func (p *OnboardPayload) Validate() error {
	return validate.Struct(p)
}

// ------------------------------------------------------------
// PATCH /me: every field optional; nil means "don't change"
// ------------------------------------------------------------

type UpdateMePayload struct {
	Name *string `json:"name" validate:"omitempty,max=100"`

	Address *string `json:"address" validate:"omitempty,max=500"`

	Phone      *string     `json:"phone" validate:"omitempty,max=15"`
	Department *Department `json:"department" validate:"omitempty,oneof=water electricity road sanitation other"`
	Zone       *string     `json:"zone" validate:"omitempty,max=100"`
}

func (p *UpdateMePayload) Validate() error {
	return validate.Struct(p)
}

// ------------------------------------------------------------
// PATCH /me/location: authority only
// ------------------------------------------------------------

type UpdateLocationPayload struct {
	Location *model.LocationInput `json:"location" validate:"required"`
}

func (p *UpdateLocationPayload) Validate() error {
	return validate.Struct(p)
}

// ------------------------------------------------------------
// GET /admin/authorities
// ------------------------------------------------------------

type GetAuthoritiesQuery struct {
	Page       *int        `query:"page" validate:"omitempty,min=1"`
	Limit      *int        `query:"limit" validate:"omitempty,min=1,max=100"`
	Department *Department `query:"department" validate:"omitempty,oneof=water electricity road sanitation other"`
	Zone       *string     `query:"zone" validate:"omitempty,max=100"`
	Verified   *bool       `query:"verified" validate:"omitempty"`
}

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

// ------------------------------------------------------------
// PATCH /admin/authorities/:id/verify
// ------------------------------------------------------------

type VerifyAuthorityPayload struct {
	ID         string `param:"id" validate:"required,startswith=user_,max=64"`
	IsVerified *bool  `json:"isVerified" validate:"required"`
}

func (p *VerifyAuthorityPayload) Validate() error {
	return validate.Struct(p)
}

// ------------------------------------------------------------
// POST /admin/users/:id/promote
// ------------------------------------------------------------

type PromoteUserPayload struct {
	ID string `param:"id" validate:"required,startswith=user_,max=64"`
}

func (p *PromoteUserPayload) Validate() error {
	return validate.Struct(p)
}
