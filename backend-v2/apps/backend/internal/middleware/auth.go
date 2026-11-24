package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/AkshatVerma087/go-civicfix/internal/errs"
	"github.com/AkshatVerma087/go-civicfix/internal/model"
	"github.com/AkshatVerma087/go-civicfix/internal/server"
	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/labstack/echo/v4"
)

// SessionCustomClaims are the custom claims added to Clerk session tokens.
// Configure in Clerk Dashboard > Sessions > Customize session token:
//
//	{ "role": "{{user.public_metadata.role}}" }
type SessionCustomClaims struct {
	Role string `json:"role"`
}

type AuthMiddleware struct {
	server *server.Server
}

func NewAuthMiddleware(s *server.Server) *AuthMiddleware {
	return &AuthMiddleware{
		server: s,
	}
}

func (auth *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return echo.WrapMiddleware(
		clerkhttp.WithHeaderAuthorization(
			clerkhttp.CustomClaimsConstructor(func(_ context.Context) any {
				return &SessionCustomClaims{}
			}),
			clerkhttp.AuthorizationFailureHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				start := time.Now()

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)

				response := map[string]string{
					"code":     "UNAUTHORIZED",
					"message":  "Unauthorized",
					"override": "false",
					"status":   "401",
				}

				if err := json.NewEncoder(w).Encode(response); err != nil {
					auth.server.Logger.Error().Err(err).Str("function", "RequireAuth").Dur(
						"duration", time.Since(start)).Msg("failed to write JSON response")
				} else {
					auth.server.Logger.Error().Str("function", "RequireAuth").Dur("duration", time.Since(start)).Msg(
						"could not get session claims from context")
				}
			}))))(func(c echo.Context) error {
		start := time.Now()
		claims, ok := clerk.SessionClaimsFromContext(c.Request().Context())

		if !ok {
			auth.server.Logger.Error().
				Str("function", "RequireAuth").
				Str("request_id", GetRequestID(c)).
				Dur("duration", time.Since(start)).
				Msg("could not get session claims from context")
			return errs.NewUnauthorizedError("Unauthorized", false)
		}

		role := ""
		if custom, ok := claims.Custom.(*SessionCustomClaims); ok {
			role = custom.Role
		}

		c.Set(UserIDKey, claims.Subject)
		c.Set(UserRoleKey, role)
		c.Set("permissions", claims.Claims.ActiveOrganizationPermissions)

		auth.server.Logger.Info().
			Str("function", "RequireAuth").
			Str("user_id", claims.Subject).
			Str("user_role", role).
			Str("request_id", GetRequestID(c)).
			Dur("duration", time.Since(start)).
			Msg("user authenticated successfully")

		return next(c)
	})
}

// RequireRole allows the request only if the session's role claim is one of roles.
// Use after RequireAuth.
func (auth *AuthMiddleware) RequireRole(roles ...model.Role) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role := model.Role(GetUserRole(c))
			for _, r := range roles {
				if role == r {
					return next(c)
				}
			}
			return errs.NewForbiddenError("You don't have access to this resource", true)
		}
	}
}

func GetUserRole(c echo.Context) string {
	if role, ok := c.Get(UserRoleKey).(string); ok {
		return role
	}
	return ""
}
