package repository

import "github.com/AkshatVerma087/go-civicfix/internal/server"

type Repositories struct {
	User *UserRepository
}

func NewRepositories(s *server.Server) *Repositories {
	return &Repositories{
		User: NewUserRepository(s),
	}
}
