package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/Arian1192/control-issue-agent/enrollment"
	"github.com/Arian1192/control-issue-agent/supabase"
)

func main() {
	configPath := flag.String("config", "/etc/control-issue-agent/config.toml", "Path to config file")
	flag.Parse()

	cfg, err := loadConfig(*configPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	log.Printf("Control Issue Agent starting (device_id=%s)", cfg.DeviceID)

	client := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey)

	// Enrollment: registrar rustdesk_id si todavía no está registrado
	if cfg.EnrollmentToken != "" {
		agentToken, regErr := enrollment.Register(cfg.SupabaseURL, cfg.EnrollmentToken)
		if regErr != nil {
			log.Printf("enrollment failed (will retry on next start): %v", regErr)
		} else {
			// Limpiar token del config tras registro exitoso (uso único)
			cfg.AgentToken = agentToken
			cfg.EnrollmentToken = ""
			if saveErr := saveConfig(*configPath, cfg); saveErr != nil {
				log.Printf("warning: could not clear enrollment token from config: %v", saveErr)
			}
		}
	}

	if cfg.AgentToken == "" {
		log.Fatalf("missing agent_token: run enrollment first")
	}

	// Iniciar bucle de sesiones remotas
	agent := supabase.NewAgent(client, cfg.DeviceID, cfg.AgentToken)

	go func() {
		if runErr := agent.Run(); runErr != nil {
			log.Fatalf("agent error: %v", runErr)
		}
	}()

	// Esperar señal de terminación
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Control Issue Agent stopping")
}
