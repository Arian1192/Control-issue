package main

import (
	"os"

	"github.com/BurntSushi/toml"
)

// Config holds the agent runtime configuration loaded from config.toml.
type Config struct {
	DeviceID        string `toml:"device_id"`
	AgentToken      string `toml:"agent_token"`
	EnrollmentToken string `toml:"enrollment_token"`
	SupabaseURL     string `toml:"supabase_url"`
	SupabaseAnonKey string `toml:"supabase_anon_key"`
}

func loadConfig(path string) (*Config, error) {
	var cfg Config
	if _, err := toml.DecodeFile(path, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func saveConfig(path string, cfg *Config) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return toml.NewEncoder(f).Encode(cfg)
}
