# EmailJS scheduling invitation setup

Configure an EmailJS service and template, then copy `.env.example` to `.env` and provide the browser public key, service ID, scheduling template ID, and public app URL.

Required template variables: `{{to_email}}`, `{{to_name}}`, `{{job_title}}`, `{{company_name}}`, `{{scheduling_url}}`, and `{{invitation_expires_at}}`.

Suggested subject: `Choose your interview time for {{job_title}}`

Suggested body:

```text
Hello {{to_name}},

You have been invited to schedule an interview for {{job_title}} at {{company_name}}.

Choose a suitable interview time using the link below:
{{scheduling_url}}

This invitation expires on {{invitation_expires_at}}.

Regards,
{{company_name}} Hiring Team
```

Do not add screening results, recommendations, or recruiter notes.

Restrict allowed origins and template usage in EmailJS. Browser public configuration is visible by design; production delivery should move to a backend or serverless worker.
