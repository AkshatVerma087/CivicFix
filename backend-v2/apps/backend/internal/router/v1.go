package router

import (
	"net/http"

	"github.com/AkshatVerma087/go-civicfix/internal/handler"
	"github.com/AkshatVerma087/go-civicfix/internal/middleware"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/labstack/echo/v4"
)

func registerV1Routes(v1 *echo.Group, h *handler.Handlers, m *middleware.Middlewares) {
	auth := m.Auth.RequireAuth

	// Current user (any signed-in user, including before onboarding)
	me := v1.Group("/me", auth)
	me.GET("", handler.Handle(h.User.Handler, h.User.GetMe, http.StatusOK, &model.GetMeRequest{}))
	me.POST("/onboarding", handler.Handle(h.User.Handler, h.User.Onboard, http.StatusCreated, &model.OnboardRequest{}))
	me.PATCH("/location", handler.Handle(h.User.Handler, h.User.UpdateLocation, http.StatusOK, &model.UpdateLocationRequest{}),
		m.Auth.RequireRole(model.RoleAuthority))

	// Admin
	admin := v1.Group("/admin", auth, m.Auth.RequireRole(model.RoleAdmin))
	admin.POST("/users/:id/promote", handler.Handle(h.User.Handler, h.User.PromoteToAdmin, http.StatusOK, &model.PromoteUserRequest{}))
}
