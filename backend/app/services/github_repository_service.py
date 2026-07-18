import base64
import binascii
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx


class GitHubRepositoryError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class NormalizedRepository:
    owner: str
    repository: str
    url: str


@dataclass
class SelectedGitHubFile:
    path: str
    content: str
    language: str | None = None


@dataclass
class GitHubRepositoryResult:
    repository: NormalizedRepository
    default_branch: str | None
    description: str | None
    primary_language: str | None
    languages: dict
    repository_size: int | None
    is_fork: bool
    archived: bool
    warnings: list[str]
    files: list[SelectedGitHubFile] = field(default_factory=list)


SECRET_PATH_MARKERS = (
    ".env",
    ".pem",
    ".key",
    "id_rsa",
    "credential",
    "secret",
    "certificate",
)

EXCLUDED_PREFIXES = (
    "node_modules/",
    "vendor/",
    "dist/",
    "build/",
    "coverage/",
    ".git/",
    ".next/",
    ".cache/",
    ".venv/",
    "venv/",
    "generated/",
)

PRIORITY_FILES = (
    "readme",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "pipfile",
    "dockerfile",
    "compose.yaml",
    "docker-compose.yml",
)


def normalize_github_url(raw_url: str) -> NormalizedRepository:
    parsed = urlparse(raw_url.strip())
    host = parsed.hostname or ""

    if parsed.scheme != "https" or host not in {"github.com", "www.github.com"}:
        raise GitHubRepositoryError("INVALID_GITHUB_URL", "Only public github.com repository URLs are supported.")

    if parsed.query or parsed.fragment:
        raise GitHubRepositoryError("INVALID_GITHUB_URL", "GitHub repository URL must not include query parameters or fragments.")

    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) != 2:
        raise GitHubRepositoryError("INVALID_GITHUB_URL", "GitHub URL must include owner and repository.")

    owner, repository = parts
    if repository.endswith(".git"):
        repository = repository[:-4]

    if not owner or not repository or ".." in owner or ".." in repository:
        raise GitHubRepositoryError("INVALID_GITHUB_URL", "GitHub repository path is invalid.")

    return NormalizedRepository(
        owner=owner,
        repository=repository,
        url=f"https://github.com/{owner}/{repository}",
    )


class GitHubRepositoryService:
    def __init__(
        self,
        *,
        api_base_url: str,
        token: str,
        timeout_seconds: int,
        max_files: int,
        max_file_size_bytes: int,
        max_total_characters: int,
    ) -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds
        self.max_files = max_files
        self.max_file_size_bytes = max_file_size_bytes
        self.max_total_characters = max_total_characters

    def analyze(self, repository_url: str) -> GitHubRepositoryResult:
        repository = normalize_github_url(repository_url)
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        with httpx.Client(base_url=self.api_base_url, headers=headers, timeout=self.timeout_seconds) as client:
            repo_response = client.get(f"/repos/{repository.owner}/{repository.repository}")
            self._raise_for_github(repo_response)
            repo_data = repo_response.json()
            languages = self._json_or_empty(client.get(f"/repos/{repository.owner}/{repository.repository}/languages"))
            tree_response = client.get(
                f"/repos/{repository.owner}/{repository.repository}/git/trees/{repo_data.get('default_branch')}",
                params={"recursive": "1"},
            )
            self._raise_for_github(tree_response)
            tree_data = tree_response.json()
            warnings = ["Repository ownership has not been independently verified."]

            if repo_data.get("fork"):
                warnings.append("Repository is a fork.")
            if repo_data.get("archived"):
                warnings.append("Repository is archived.")
            if tree_data.get("truncated"):
                warnings.append("GitHub returned a truncated repository tree.")

            selected_paths = self._select_paths(tree_data.get("tree", []))
            files: list[SelectedGitHubFile] = []
            total_characters = 0
            for path in selected_paths:
                if total_characters >= self.max_total_characters:
                    break
                content_response = client.get(f"/repos/{repository.owner}/{repository.repository}/contents/{path}")
                if content_response.status_code >= 400:
                    continue
                item = content_response.json()
                if item.get("size", 0) > self.max_file_size_bytes:
                    continue
                try:
                    decoded = base64.b64decode(item.get("content", ""), validate=False).decode("utf-8")
                except (UnicodeDecodeError, binascii.Error):
                    continue
                if "\x00" in decoded:
                    continue
                remaining = self.max_total_characters - total_characters
                bounded = decoded[:remaining]
                total_characters += len(bounded)
                files.append(SelectedGitHubFile(path=path, content=bounded, language=_language_for_path(path)))

        return GitHubRepositoryResult(
            repository=repository,
            default_branch=repo_data.get("default_branch"),
            description=repo_data.get("description"),
            primary_language=repo_data.get("language"),
            languages=languages,
            repository_size=repo_data.get("size"),
            is_fork=bool(repo_data.get("fork")),
            archived=bool(repo_data.get("archived")),
            warnings=warnings,
            files=files,
        )

    def _select_paths(self, tree: list[dict]) -> list[str]:
        candidates = [
            item["path"]
            for item in tree
            if item.get("type") == "blob" and self._allowed_path(item.get("path", ""))
        ]

        def score(path: str) -> tuple[int, str]:
            lower = path.lower()
            priority = 0
            if any(lower.endswith(item) or lower == item for item in PRIORITY_FILES):
                priority -= 100
            if lower.startswith(".github/workflows/"):
                priority -= 80
            if "/test" in lower or lower.startswith("test"):
                priority -= 40
            if lower.startswith(("src/", "app/", "api/", "backend/")):
                priority -= 30
            return priority, lower

        return sorted(candidates, key=score)[: self.max_files]

    def _allowed_path(self, path: str) -> bool:
        lower = path.lower()
        if lower.startswith(EXCLUDED_PREFIXES):
            return False
        if any(marker in lower for marker in SECRET_PATH_MARKERS):
            return False
        if lower.endswith((".png", ".jpg", ".jpeg", ".gif", ".zip", ".tar", ".gz", ".map", ".lock")):
            return False
        return True

    def _raise_for_github(self, response: httpx.Response) -> None:
        if response.status_code == 404:
            raise GitHubRepositoryError("GITHUB_REPOSITORY_NOT_FOUND", "GitHub repository was not found or is private.")
        if response.status_code == 403:
            raise GitHubRepositoryError("GITHUB_RATE_LIMITED", "GitHub request was blocked or rate limited.")
        if response.status_code >= 400:
            raise GitHubRepositoryError("GITHUB_REQUEST_FAILED", "GitHub repository could not be analyzed.")

    def _json_or_empty(self, response: httpx.Response) -> dict:
        if response.status_code >= 400:
            return {}
        return response.json()


def _language_for_path(path: str) -> str | None:
    suffix = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return {
        "py": "Python",
        "ts": "TypeScript",
        "tsx": "TypeScript",
        "js": "JavaScript",
        "jsx": "JavaScript",
        "java": "Java",
        "go": "Go",
        "rs": "Rust",
    }.get(suffix)
