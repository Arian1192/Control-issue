package rustdesk

import (
	"bytes"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// GetID returns the RustDesk permanent ID for this device.
func GetID() (string, error) {
	cmd := rustdeskCmd("--get-id")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("rustdesk --get-id: %w", err)
	}
	id := strings.TrimSpace(string(out))
	if id == "" {
		return "", fmt.Errorf("rustdesk returned empty ID")
	}
	return id, nil
}

// GenerateOTP calls `rustdesk --password` to create a one-time password
// that the technician uses to connect during a session.
func GenerateOTP() (string, error) {
	cmd := rustdeskCmd("--password")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("rustdesk --password (%s): %w", stderr.String(), err)
	}

	otp := strings.TrimSpace(stdout.String())
	if otp == "" {
		return "", fmt.Errorf("rustdesk returned empty password")
	}
	return otp, nil
}

// WaitForID polls until RustDesk reports a non-empty ID (useful on first run).
func WaitForID(maxWait time.Duration) (string, error) {
	deadline := time.Now().Add(maxWait)
	for time.Now().Before(deadline) {
		id, err := GetID()
		if err == nil && id != "" {
			return id, nil
		}
		time.Sleep(2 * time.Second)
	}
	return "", fmt.Errorf("timed out waiting for RustDesk ID after %s", maxWait)
}

func rustdeskCmd(args ...string) *exec.Cmd {
	switch runtime.GOOS {
	case "windows":
		return exec.Command(`C:\Program Files\RustDesk\rustdesk.exe`, args...)
	case "darwin":
		return exec.Command("/Applications/RustDesk.app/Contents/MacOS/RustDesk", args...)
	default:
		return exec.Command("rustdesk", args...)
	}
}
