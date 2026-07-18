# Automatic AI Screening MVP

This backend implements automatic candidate screening after a public application submission.

## Environment

Required local configuration lives in `backend/.env`. Use `backend/.env.example` as the safe template.

- `OPENAI_API_KEY`: backend-only OpenAI key. Never expose this through Vite.
- `OPENAI_MODEL`: model used by the Responses API.
- `AI_SCREENING_ENABLED`: enables automatic screening.
- `AI_SCREENING_CLIENT_MODE`: `REAL` for the hackathon demo, `FAKE` for tests.
- `GITHUB_TOKEN`: optional token for higher GitHub REST API limits.
- `CV_UPLOAD_DIRECTORY`: controlled backend CV storage directory.
- `CV_MAX_FILE_SIZE_MB`: upload size limit.
- `GITHUB_MAX_FILES`, `GITHUB_MAX_FILE_SIZE_BYTES`, `GITHUB_MAX_TOTAL_CHARACTERS`: repository analysis limits.

## Startup

From the repository root:

```bash
docker compose --env-file .env.docker -f compose.yaml up -d postgres
```

From `backend/`:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python -m app.services.seed_auth
.venv/bin/uvicorn app.main:app --reload --port 8000
```

From `Frontend/`:

```bash
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` when using the backend API path.

## Demo Data

In development, prepare a published demo job and rubric:

```bash
curl -X POST http://localhost:8000/api/v1/demo/seed-ai-screening
```

This creates a published job, job requirements, and a 100-point published rubric. The main demo still begins from real candidate submission.

## Submission Flow

`POST /api/v1/applications/submit` accepts multipart form data with candidate fields, answers JSON, optional CV, optional GitHub URL, consent, and an `Idempotency-Key` header.

The backend:

1. validates the job, answers, CV, GitHub URL, and consent;
2. persists the candidate, application, answers, CV metadata, and a `QUEUED` screening run;
3. commits the transaction;
4. returns HTTP `202`;
5. starts FastAPI `BackgroundTasks` using application/run IDs only.

Recruiters do not start normal screening manually.

## BackgroundTasks Limitation

FastAPI `BackgroundTasks` is acceptable for this hackathon MVP, but it is not a durable production queue. A backend restart may interrupt an in-process screening task. Production should move this work to a durable worker queue.

## Evidence Handling

CV parsing supports PDF through PyMuPDF, DOCX through python-docx, and TXT through safe decoding. OCR is not used. Scanned or image-only PDFs are preserved but flagged for human review.

GitHub analysis uses the GitHub REST API only. The backend does not clone repositories, execute code, run package installs, build containers, fetch profile data, or use repository popularity as competence evidence. Repository ownership is not independently verified in this MVP.

## AI And Scoring

The frontend never calls OpenAI. The backend builds a de-identified payload that excludes candidate name, email, phone, and protected fields before calling the screening client.

The AI returns structured criterion assessments only. Python calculates authoritative coverage, weighted score, must-have gates, and the advisory recommendation. AI does not make final hiring or rejection decisions.

## Candidate Status

`GET /api/v1/applications/{application_id}/submission-status?status_token=...` returns candidate-safe progress only. It does not expose score, recommendation, criterion ratings, model details, recruiter concerns, or raw evidence.

## Recruiter Review

Protected endpoints under `/api/v1/recruiter` expose queue, detail, retry, and human review actions to authorized roles. Overrides require a recorded reason. Human reviewers retain final shortlist authority.
