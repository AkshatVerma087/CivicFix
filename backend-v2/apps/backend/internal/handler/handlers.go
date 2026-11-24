package handler

import (
	"github.com/AkshatVerma087/go-civicfix/internal/server"
	"github.com/AkshatVerma087/go-civicfix/internal/service"
)

type Handlers struct {
	Health  *HealthHandler
	OpenAPI *OpenAPIHandler
	User    *UserHandler
}

func NewHandlers(s *server.Server, services *service.Services) *Handlers {
	return &Handlers{
		Health:  NewHealthHandler(s),
		OpenAPI: NewOpenAPIHandler(s),
		User:    NewUserHandler(s, services.User),
	}
}
