# ⚙️ Alterforge

> **Forge modular microservices that you can alter anytime.**  
> A CLI for Node.js, GraphQL, gRPC, Sequelize, and Docker-based architectures.

---

## 🚀 Overview

**Alterforge** is a powerful CLI tool that helps you scaffold and manage **modular microservice architectures** — all in a few commands.  
It’s built for developers who want **speed**, **structure**, and **scalability** without the repetitive setup work.

---

## ✨ Features

- 🧱 **Instant Microservice Scaffolding** — Express-based services with prebuilt structure.  
- 🧩 **Optional Integrations** — Add Sequelize, GraphQL, and gRPC support as needed.  
- 🐳 **Docker-Ready** — Auto-generates Dockerfiles and Compose setup.  
- ⚡ **Frontend Add-on** — Instantly attach React or Angular frontends.  
- 🔄 **CI/CD Ready** — Seamlessly integrates with GitHub Actions workflows.  
- 🧰 **Customizable Architecture** — Perfect for microservice or modular monolith setups.

---

## 📦 Installation

```bash
npm install -g alterforge
````

Or clone the repo and link it locally for development:

```bash
git clone https://github.com/yourusername/alterforge.git
cd alterforge
npm link
```

---

## 🧩 Commands

### 1️⃣ Initialize a New Project

```bash
alterforge init <projectName>
```

Creates a full microservice environment:

```
projectName/
 ├─ docker/
 │  └─ docker-compose.yml
 ├─ services/
 │  └─ core/
 └─ frontend/ (optional)
```

---

### 2️⃣ Add a New Service

```bash
alterforge add-service <serviceName>
```

Choose features interactively:

```
? Select features for auth service:
  ◻ Sequelize
  ◻ GraphQL
  ◻ gRPC
```

Generates a ready-to-run service inside `/services/`.

---

### 3️⃣ Add a Frontend

```bash
alterforge add-frontend
```

Select React or Angular — it scaffolds and links the frontend automatically.

---

### 4️⃣ Build and Run via Docker

```bash
alterforge up
```

Runs all services and database using Docker Compose.

To rebuild:

```bash
alterforge build
```

---

## ⚙️ Example Workflow

```bash
alterforge init ecommerce
cd ecommerce
alterforge add-service auth
alterforge add-service products
alterforge add-frontend
alterforge up
```

---

## 🧠 Project Structure Example

```
ecommerce/
 ├─ docker/
 │  └─ docker-compose.yml
 ├─ services/
 │  ├─ core/
 │  │  ├─ src/
 │  │  │  ├─ index.js
 │  │  │  ├─ models/
 │  │  │  ├─ graphql/
 │  │  │  └─ grpc/
 │  │  └─ Dockerfile
 │  └─ auth/
 └─ frontend/
```

---

## 🐳 Docker Compose Example

```yaml
version: '3.9'
services:
  core:
    build: ../services/core
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
    depends_on:
      - db

  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: microdb
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

---

## 🔧 GitHub Actions (CI/CD)

You can automate build and deployment using a GitHub Actions workflow:

```yaml
name: Alterforge CI/CD

on:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Lint and Test
        run: npm test || echo "No tests yet"

      - name: Build Docker images
        run: docker compose -f docker/docker-compose.yml build
```

---

## 🧠 Future Roadmap

* [ ] Add TypeScript support
* [ ] Add Nest.js service option
* [ ] Auto-generate Kubernetes manifests
* [ ] Built-in API Gateway & Service Registry
* [ ] Marketplace for microservice templates
* [ ] Multi-language support for services (Python, Go, etc.)


---

## 🧑‍💻 Author

**Yash Talegaonkar**
Full Stack Developer • Node.js • Angular • AWS
🔗 [LinkedIn](https://www.linkedin.com/in/yashtalegaonkar)

---

## 📄 License

MIT License © 2025 Yash Talegaonkar

---

> “Don’t just build services — **forge them.** 🔥”
