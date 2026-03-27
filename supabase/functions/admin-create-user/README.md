# admin-create-user Edge Function

Handles privileged user operations that require the service role key.

## Deploy

```bash
# Set the service role secret (one time)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Deploy
supabase functions deploy admin-create-user
```

## Endpoints

### POST /functions/v1/admin-create-user

**Create user** (`action: "create"`):
```json
{
  "action": "create",
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe",
  "role": "technician"
}
```

**Update email** (`action: "update-email"`):
```json
{
  "action": "update-email",
  "userId": "uuid-here",
  "newEmail": "newemail@example.com"
}
```

All requests require `Authorization: Bearer <user-jwt>` from an `admin-it` user.
