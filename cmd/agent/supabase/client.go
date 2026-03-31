package supabase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Arian1192/control-issue-agent/rustdesk"
)

// Client wraps agent access to Supabase Edge Functions.
type Client struct {
	baseURL string
	anonKey string
	http    *http.Client
}

// SessionTask represents an accepted session waiting for an OTP.
type SessionTask struct {
	ID string `json:"id"`
}

// NewClient creates a new Supabase client.
func NewClient(baseURL, anonKey string) *Client {
	return &Client{
		baseURL: baseURL,
		anonKey: anonKey,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) callFunction(payload map[string]string, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		http.MethodPost,
		strings.TrimRight(c.baseURL, "/")+"/functions/v1/enrollment-token",
		bytes.NewReader(body),
	)
	if err != nil {
		return err
	}

	req.Header.Set("apikey", c.anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("edge function error %d: %s", resp.StatusCode, string(respBody))
	}

	if out == nil || len(respBody) == 0 {
		return nil
	}

	return json.Unmarshal(respBody, out)
}

// Heartbeat marks the device as online.
func (c *Client) Heartbeat(deviceID, agentToken string) error {
	return c.callFunction(map[string]string{
		"action":      "heartbeat",
		"device_id":   deviceID,
		"agent_token": agentToken,
	}, nil)
}

// PullAcceptedSession returns one accepted session that still needs an OTP.
func (c *Client) PullAcceptedSession(deviceID, agentToken string) (*SessionTask, error) {
	var result struct {
		Session *SessionTask `json:"session"`
	}

	if err := c.callFunction(map[string]string{
		"action":      "pull-session",
		"device_id":   deviceID,
		"agent_token": agentToken,
	}, &result); err != nil {
		return nil, err
	}

	return result.Session, nil
}

// ReportOTP stores the generated OTP for an accepted session.
func (c *Client) ReportOTP(deviceID, agentToken, sessionID, otp string, expiresAt time.Time) error {
	return c.callFunction(map[string]string{
		"action":         "report-otp",
		"device_id":      deviceID,
		"agent_token":    agentToken,
		"session_id":     sessionID,
		"otp":            otp,
		"otp_expires_at": expiresAt.UTC().Format(time.RFC3339),
	}, nil)
}

// Agent handles the polling loop and OTP generation.
type Agent struct {
	client     *Client
	deviceID   string
	agentToken string
}

// NewAgent creates a new Agent for the given device.
func NewAgent(client *Client, deviceID, agentToken string) *Agent {
	return &Agent{client: client, deviceID: deviceID, agentToken: agentToken}
}

// Run starts the polling loop.
func (a *Agent) Run() error {
	if strings.TrimSpace(a.agentToken) == "" {
		return fmt.Errorf("missing agent token")
	}

	if err := a.tick(); err != nil {
		log.Printf("initial agent tick failed: %v", err)
	}

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := a.tick(); err != nil {
			log.Printf("agent tick failed: %v", err)
		}
	}

	return nil
}

func (a *Agent) tick() error {
	if err := a.client.Heartbeat(a.deviceID, a.agentToken); err != nil {
		return fmt.Errorf("heartbeat: %w", err)
	}

	session, err := a.client.PullAcceptedSession(a.deviceID, a.agentToken)
	if err != nil {
		return fmt.Errorf("pull accepted session: %w", err)
	}
	if session == nil || session.ID == "" {
		return nil
	}

	log.Printf("Session %s accepted — generating OTP", session.ID)

	otp, err := rustdesk.GenerateOTP()
	if err != nil {
		return fmt.Errorf("generate otp for session %s: %w", session.ID, err)
	}

	expiresAt := time.Now().Add(10 * time.Minute)
	if err := a.client.ReportOTP(a.deviceID, a.agentToken, session.ID, otp, expiresAt); err != nil {
		return fmt.Errorf("report otp for session %s: %w", session.ID, err)
	}

	log.Printf("OTP set for session %s (expires %s)", session.ID, expiresAt.UTC().Format(time.RFC3339))
	return nil
}
