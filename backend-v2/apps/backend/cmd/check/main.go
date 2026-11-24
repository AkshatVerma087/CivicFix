// Command check verifies every external dependency in .env is reachable and the
// credentials are valid. It only makes read-only calls and never prints secrets.
//
//	task check        (or: go run ./cmd/check)
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AkshatVerma087/go-civicfix/internal/config"
	"github.com/AkshatVerma087/go-civicfix/internal/database"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type status int

const (
	ok status = iota
	fail
	skipped
)

type result struct {
	name   string
	status status
	detail string
}

// Values shipped in .env.sample; treated as "not configured".
var placeholders = map[string]bool{
	"": true, "secret": true, "resend_key": true, "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx": true,
}

var httpClient = &http.Client{Timeout: 15 * time.Second}

func main() {
	cfg, err := config.LoadConfig() // exits with a clear message if required fields are missing
	if err != nil {
		fmt.Println("config: ", err)
		os.Exit(1)
	}

	ctx := context.Background()
	results := []result{
		checkPostgres(cfg),
		checkRedis(ctx, cfg),
		checkClerk(ctx, cfg),
		checkResend(ctx, cfg),
		checkCloudinary(ctx, cfg),
		checkNewRelic(cfg),
	}

	failed := false
	fmt.Println()
	for _, r := range results {
		icon := map[status]string{ok: "[ OK ]", fail: "[FAIL]", skipped: "[ -- ]"}[r.status]
		fmt.Printf("%s %-11s %s\n", icon, r.name, r.detail)
		if r.status == fail {
			failed = true
		}
	}
	fmt.Println()
	if failed {
		os.Exit(1)
	}
}

func checkPostgres(cfg *config.Config) result {
	logger := zerolog.Nop()
	db, err := database.New(cfg, &logger, nil)
	if err != nil {
		return result{"Postgres", fail, err.Error()}
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var version int32
	err = db.Pool.QueryRow(ctx, "SELECT version FROM schema_version").Scan(&version)
	where := fmt.Sprintf("%s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	if err != nil {
		return result{"Postgres", ok, fmt.Sprintf("connected to %s, but no migrations applied yet (run: task migrations:up)", where)}
	}
	return result{"Postgres", ok, fmt.Sprintf("connected to %s, schema version %d", where, version)}
}

func checkRedis(ctx context.Context, cfg *config.Config) result {
	client := redis.NewClient(&redis.Options{Addr: cfg.Redis.Address})
	defer client.Close()

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return result{"Redis", fail, fmt.Sprintf("%s: %v", cfg.Redis.Address, err)}
	}
	return result{"Redis", ok, "connected to " + cfg.Redis.Address}
}

func checkClerk(ctx context.Context, cfg *config.Config) result {
	key := cfg.Auth.SecretKey
	if placeholders[key] {
		return result{"Clerk", skipped, "CIVICFIX_AUTH.SECRET_KEY not set (Clerk Dashboard > Configure > API keys > Secret key)"}
	}
	if !strings.HasPrefix(key, "sk_test_") && !strings.HasPrefix(key, "sk_live_") {
		return result{"Clerk", fail, "CIVICFIX_AUTH.SECRET_KEY should start with sk_test_ or sk_live_ (that's the Secret key, not the Publishable key)"}
	}

	code, body, err := get(ctx, "https://api.clerk.com/v1/users?limit=1", map[string]string{"Authorization": "Bearer " + key})
	if err != nil {
		return result{"Clerk", fail, err.Error()}
	}
	if code != http.StatusOK {
		return result{"Clerk", fail, fmt.Sprintf("API returned %d: %s", code, apiMessage(body))}
	}
	mode := "development instance"
	if strings.HasPrefix(key, "sk_live_") {
		mode = "production instance"
	}
	// Show which instance the key belongs to, so it can be matched against the
	// frontend's publishable key (which encodes the same Frontend API host).
	if code, body, err := get(ctx, "https://api.clerk.com/v1/domains", map[string]string{"Authorization": "Bearer " + key}); err == nil && code == http.StatusOK {
		var resp struct {
			Data []struct {
				FrontendAPIURL string `json:"frontend_api_url"`
			} `json:"data"`
		}
		if json.Unmarshal(body, &resp) == nil && len(resp.Data) > 0 && resp.Data[0].FrontendAPIURL != "" {
			mode += ", " + strings.TrimPrefix(resp.Data[0].FrontendAPIURL, "https://")
		}
	}
	return result{"Clerk", ok, "secret key accepted (" + mode + ")"}
}

func checkResend(ctx context.Context, cfg *config.Config) result {
	key := cfg.Integration.ResendAPIKey
	if placeholders[key] {
		return result{"Resend", skipped, "CIVICFIX_INTEGRATION.RESEND_API_KEY not set (resend.com > API Keys)"}
	}

	code, body, err := get(ctx, "https://api.resend.com/domains", map[string]string{"Authorization": "Bearer " + key})
	if err != nil {
		return result{"Resend", fail, err.Error()}
	}
	switch {
	case code == http.StatusOK:
		var resp struct {
			Data []struct {
				Name   string `json:"name"`
				Status string `json:"status"`
			} `json:"data"`
		}
		_ = json.Unmarshal(body, &resp)
		if len(resp.Data) == 0 {
			return result{"Resend", ok, "key accepted; no verified domain, so mail from onboarding@resend.dev only reaches your own Resend account email"}
		}
		var doms []string
		for _, d := range resp.Data {
			doms = append(doms, d.Name+" ("+d.Status+")")
		}
		return result{"Resend", ok, "key accepted; domains: " + strings.Join(doms, ", ")}
	case code == http.StatusUnauthorized && strings.Contains(string(body), "restricted_api_key"):
		return result{"Resend", ok, "key accepted (sending-only key, can't list domains)"}
	default:
		return result{"Resend", fail, fmt.Sprintf("API returned %d: %s", code, apiMessage(body))}
	}
}

func checkCloudinary(ctx context.Context, cfg *config.Config) result {
	in := cfg.Integration
	if in.CloudinaryCloudName == "" || in.CloudinaryAPIKey == "" || in.CloudinaryAPISecret == "" {
		return result{"Cloudinary", skipped, "CIVICFIX_INTEGRATION.CLOUDINARY_* not set (Cloudinary Console > Settings > API Keys)"}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.cloudinary.com/v1_1/"+in.CloudinaryCloudName+"/ping", nil)
	if err != nil {
		return result{"Cloudinary", fail, err.Error()}
	}
	req.SetBasicAuth(in.CloudinaryAPIKey, in.CloudinaryAPISecret)
	resp, err := httpClient.Do(req)
	if err != nil {
		return result{"Cloudinary", fail, err.Error()}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return result{"Cloudinary", fail, fmt.Sprintf("API returned %d: %s", resp.StatusCode, apiMessage(body))}
	}
	return result{"Cloudinary", ok, "credentials accepted for cloud " + in.CloudinaryCloudName}
}

func checkNewRelic(cfg *config.Config) result {
	key := cfg.Observability.NewRelic.LicenseKey
	if placeholders[key] {
		return result{"New Relic", skipped, "license key not set; optional, app runs without it (one.newrelic.com > API keys > INGEST - LICENSE)"}
	}

	app, err := newrelic.NewApplication(
		newrelic.ConfigAppName(cfg.Observability.ServiceName+"-check"),
		newrelic.ConfigLicense(key),
	)
	if err != nil {
		return result{"New Relic", fail, err.Error()}
	}
	defer app.Shutdown(5 * time.Second)

	if err := app.WaitForConnection(20 * time.Second); err != nil {
		return result{"New Relic", fail, "agent could not connect: " + err.Error()}
	}
	return result{"New Relic", ok, "agent connected"}
}

func get(ctx context.Context, url string, headers map[string]string) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// apiMessage pulls a human-readable message out of a JSON error body.
func apiMessage(body []byte) string {
	var m map[string]any
	if json.Unmarshal(body, &m) == nil {
		for _, k := range []string{"message", "error"} {
			switch v := m[k].(type) {
			case string:
				return v
			case map[string]any:
				if s, ok := v["message"].(string); ok {
					return s
				}
			}
		}
		if errs, ok := m["errors"].([]any); ok && len(errs) > 0 {
			if e, ok := errs[0].(map[string]any); ok {
				if s, ok := e["long_message"].(string); ok {
					return s
				}
				if s, ok := e["message"].(string); ok {
					return s
				}
			}
		}
	}
	s := strings.TrimSpace(string(body))
	if len(s) > 200 {
		s = s[:200] + "..."
	}
	return s
}
