package service

import (
	"github.com/AkshatVerma087/go-civicfix/internal/lib/job"
	"github.com/AkshatVerma087/go-civicfix/internal/repository"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
)

type Services struct {
	Auth *AuthService
	User *UserService
	Job  *job.JobService
}

func NewServices(s *server.Server, repos *repository.Repositories) (*Services, error) {
	authService := NewAuthService(s)

	return &Services{
		Job:  s.Job,
		Auth: authService,
		User: NewUserService(s, repos.User),
	}, nil
}
