package enrollment

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

// Register reads the RustDesk ID and reports it to the enrollment edge function.
// The enrollment token is consumed on success and replaced by a persistent agent token.
func Register(supabaseURL, enrollmentToken string) (string, error) {
	log.Println("Starting enrollment registration...")

	id, err := rustdesk.WaitForID(2 * time.Minute)
	if err != nil {
		return "", fmt.Errorf("could not get RustDesk ID: %w", err)
	}

	log.Printf("RustDesk ID: %s", id)

	edgeFnURL := strings.TrimRight(supabaseURL, "/") + "/functions/v1/enrollment-token"

	payload := map[string]string{
		"action":           "register",
		"enrollment_token": enrollmentToken,
		"rustdesk_id":      id,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	httpClient := &http.Client{Timeout: 30 * time.Second}
	resp, err := httpClient.Post(edgeFnURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("enrollment request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("enrollment failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		AgentToken string `json:"agent_token"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("invalid enrollment response: %w", err)
	}
	if strings.TrimSpace(result.AgentToken) == "" {
		return "", fmt.Errorf("enrollment response missing agent_token")
	}

	log.Printf("Enrollment successful: %s", string(respBody))
	return result.AgentToken, nil
}
