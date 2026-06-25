.PHONY: install dev build test up down seed

install: ## Install all workspace dependencies
	corepack pnpm install

dev: ## Run API and web together
	corepack pnpm dev

build: ## Build API and web for production
	corepack pnpm build

test: ## Run API unit tests
	corepack pnpm test

up: ## Start Postgres, Redis and the API (docker compose)
	docker compose up -d

down: ## Stop the docker compose stack
	docker compose down

seed: ## Insert 5 example services into the database
	corepack pnpm --filter api seed
