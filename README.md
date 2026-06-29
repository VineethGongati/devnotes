# DevNotes

A production-ready full-stack notes application deployed on Kubernetes with automated CI/CD, persistent storage, and caching.

---

## Architecture

```
+-------------+     +-------------+     +-------------+
|   Browser   |---->|   Nginx     |---->|  React UI   |
+-------------+     +-------------+     +-------------+
                           |
                           v
                    +-------------+
                    |  Node.js    |
                    |  Backend    |
                    +-------------+
                           |
              +------------+------------+
              v                         v
        +-------------+           +-------------+
        | PostgreSQL  |           |    Redis    |
        |  (PVC)      |           |   (Cache)   |
        +-------------+           +-------------+
```

---

## Tech Stack

| **Layer**     | **Technology**     |
|---------------|--------------------|
| Frontend      | React, Vite, Nginx |
| Backend       | Node.js, Express   |
| Database      | PostgreSQL 15      |
| Cache         | Redis 7            |
| Orchestration | Kubernetes         |
| CI/CD         | GitHub Actions     |
| Registry      | Docker Hub         |

---

## Features

- Create, edit, delete notes with tags
- Pin important notes
- Search and filter by tags
- Persistent storage (survives pod restarts)
- Redis caching for performance
- Automated CI/CD with versioned Docker images
- Health checks and graceful error handling

---

## CI/CD Pipeline

Every push to `main` triggers:

- **Build & Push Backend** → `vineethgongati/devnotes-backend:v{N}`
- **Build & Push Frontend** → `vineethgongati/devnotes-frontend:v{N}`
- **Update K8s Manifests** → Auto-commit image tags to repo

---

## Quick Start (Local)

```bash
# Clone
git clone https://github.com/VineethGongati/devnotes.git
cd devnotes

# Start with Docker Compose
docker-compose up

# Or deploy to Kubernetes
kubectl apply -f k8s/
```

---

## Key Design Decisions

### Why PVC over StatefulSet?
For a single PostgreSQL instance, a Deployment + PVC is simpler and sufficient. StatefulSet would be needed for a primary-replica setup.

### Why Nginx reverse proxy?
Eliminates hardcoded backend URLs in the frontend. The browser calls `/api/notes` and Nginx routes it to the backend service internally.

### Why versioned tags instead of `:latest`?
`:latest` causes cache issues and makes rollbacks impossible. Versioned tags (`v1`, `v2`) enable traceability and easy rollbacks.

---

## Lessons Learned

- **K8s DNS:** Service names must match exactly (`devnotes-postgres` ≠ `postgres-service`)
- **`imagePullPolicy: Never`** prevents CI/CD from working — remove it
- GitHub Actions needs **Read and write permissions** to auto-commit manifest updates

---

## Connect

- **LinkedIn:** [linkedin.com/in/vineeth-gongati-b57248210](https://www.linkedin.com/in/vineeth-gongati-b57248210)

> Open to: Cloud Engineer | DevOps | SRE roles
