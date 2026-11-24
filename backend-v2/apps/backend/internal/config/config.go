package config

import (
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	_ "github.com/joho/godotenv/autoload"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/v2"
	"github.com/rs/zerolog"
)

type Config struct {
	Primary       Primary              `koanf:"primary" validate:"required"`
	Server        ServerConfig         `koanf:"server" validate:"required"`
	Database      DatabaseConfig       `koanf:"database" validate:"required"`
	Auth          AuthConfig           `koanf:"auth" validate:"required"`
	Redis         RedisConfig          `koanf:"redis" validate:"required"`
	Integration   IntegrationConfig    `koanf:"integration" validate:"required"`
	Observability *ObservabilityConfig `koanf:"observability"`
}

type Primary struct {
	Env string `koanf:"env" validate:"required"`
}

type ServerConfig struct {
	Port               string   `koanf:"port" validate:"required"`
	ReadTimeout        int      `koanf:"read_timeout" validate:"required"`
	WriteTimeout       int      `koanf:"write_timeout" validate:"required"`
	IdleTimeout        int      `koanf:"idle_timeout" validate:"required"`
	CORSAllowedOrigins []string `koanf:"cors_allowed_origins" validate:"required"`
}

type DatabaseConfig struct {
	Host            string `koanf:"host" validate:"required"`
	Port            int    `koanf:"port" validate:"required"`
	User            string `koanf:"user" validate:"required"`
	Password        string `koanf:"password"`
	Name            string `koanf:"name" validate:"required"`
	SSLMode         string `koanf:"ssl_mode" validate:"required"`
	MaxOpenConns    int    `koanf:"max_open_conns" validate:"required"`
	MaxIdleConns    int    `koanf:"max_idle_conns" validate:"required"`
	ConnMaxLifetime int    `koanf:"conn_max_lifetime" validate:"required"`
	ConnMaxIdleTime int    `koanf:"conn_max_idle_time" validate:"required"`
}
type RedisConfig struct {
	Address string `koanf:"address" validate:"required"`
}

type IntegrationConfig struct {
	ResendAPIKey string `koanf:"resend_api_key" validate:"required"`

	// Cloudinary media storage (same account the Node backend uses).
	// Not required at boot, matching the Node backend; uploads fail until set.
	CloudinaryCloudName string `koanf:"cloudinary_cloud_name"`
	CloudinaryAPIKey    string `koanf:"cloudinary_api_key"`
	CloudinaryAPISecret string `koanf:"cloudinary_api_secret"`
}

type AuthConfig struct {
	// Clerk Secret key (sk_test_... / sk_live_...).
	SecretKey string `koanf:"secret_key" validate:"required"`
	// Comma-separated emails that become admin when they complete onboarding
	// (bootstraps the first admin; later admins are promoted via the API).
	BootstrapAdminEmails []string `koanf:"bootstrap_admin_emails"`
}

// IsBootstrapAdmin reports whether email is on the admin allow-list (case-insensitive).
func (a AuthConfig) IsBootstrapAdmin(email string) bool {
	for _, e := range a.BootstrapAdminEmails {
		if strings.EqualFold(e, email) {
			return true
		}
	}
	return false
}

func LoadConfig() (*Config, error) {
	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).With().Timestamp().Logger()

	k := koanf.New(".")

	err := k.Load(env.Provider("CIVICFIX_", ".", func(s string) string {
		return strings.ToLower(strings.TrimPrefix(s, "CIVICFIX_"))
	}), nil)
	if err != nil {
		logger.Fatal().Err(err).Msg("could not load initial env variables")
	}

	mainConfig := &Config{}

	err = k.Unmarshal("", mainConfig)
	if err != nil {
		logger.Fatal().Err(err).Msg("could not unmarshal main config")
	}

	// koanf reads an env var as one string, so split comma-separated lists here.
	mainConfig.Auth.BootstrapAdminEmails = splitList(mainConfig.Auth.BootstrapAdminEmails)

	validate := validator.New()

	err = validate.Struct(mainConfig)
	if err != nil {
		logger.Fatal().Err(err).Msg("config validation failed")
	}

	// Set default observability config if not provided
	if mainConfig.Observability == nil {
		mainConfig.Observability = DefaultObservabilityConfig()
	}

	// Override service name and environment from primary config
	mainConfig.Observability.ServiceName = "civicfix"
	mainConfig.Observability.Environment = mainConfig.Primary.Env

	// Validate observability config
	if err := mainConfig.Observability.Validate(); err != nil {
		logger.Fatal().Err(err).Msg("invalid observability config")
	}

	return mainConfig, nil
}

// splitList flattens comma-separated entries and drops blanks.
func splitList(in []string) []string {
	var out []string
	for _, entry := range in {
		for _, v := range strings.Split(entry, ",") {
			if v = strings.TrimSpace(v); v != "" {
				out = append(out, v)
			}
		}
	}
	return out
}
