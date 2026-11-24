package handler

import (
	"github.com/AkshatVerma087/go-civicfix/internal/middleware"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
	"github.com/AkshatVerma087/go-civicfix/internal/service"
	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	Handler
	users *service.UserService
}

func NewUserHandler(s *server.Server, users *service.UserService) *UserHandler {
	return &UserHandler{Handler: NewHandler(s), users: users}
}

// GetMe: GET /api/v1/me
func (h *UserHandler) GetMe(c echo.Context, _ *model.GetMeRequest) (*model.Me, error) {
	return h.users.Me(c.Request().Context(), middleware.GetUserID(c))
}

// Onboard: POST /api/v1/me/onboarding
func (h *UserHandler) Onboard(c echo.Context, req *model.OnboardRequest) (*model.Me, error) {
	return h.users.Onboard(c.Request().Context(), middleware.GetUserID(c), req)
}

// UpdateLocation: PATCH /api/v1/me/location (authority only)
func (h *UserHandler) UpdateLocation(c echo.Context, req *model.UpdateLocationRequest) (*model.Me, error) {
	return h.users.UpdateLocation(c.Request().Context(), middleware.GetUserID(c), *req.GeoPoint())
}

// PromoteToAdmin: POST /api/v1/admin/users/:id/promote (admin only)
func (h *UserHandler) PromoteToAdmin(c echo.Context, req *model.PromoteUserRequest) (*model.User, error) {
	return h.users.PromoteToAdmin(c.Request().Context(), req.ID)
}
