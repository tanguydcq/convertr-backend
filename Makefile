# Convertr Backend - Makefile
# ===========================

.PHONY: help install dev build start test test-watch test-coverage lint clean
.PHONY: docker-up docker-down docker-logs docker-ps
.PHONY: db-migrate db-migrate-reset db-seed db-studio db-push db-generate
.PHONY: setup reset all

# Default target
.DEFAULT_GOAL := help

# Colors
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

# =============================================================================
# HELP
# =============================================================================
help: ## Show this help message
	@echo ""
	@echo "$(BLUE)Convertr Backend$(NC) - Available Commands"
	@echo "==========================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# DEVELOPMENT
# =============================================================================
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install

dev: ## Start development server with hot reload
	@echo "$(GREEN)Starting dev server...$(NC)"
	npm run dev

build: ## Build TypeScript for production
	@echo "$(BLUE)Building project...$(NC)"
	npm run build

start: ## Start production server (requires build)
	@echo "$(GREEN)Starting production server...$(NC)"
	npm run start

# =============================================================================
# TESTING
# =============================================================================
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	npm test

test-leads: ## Run leads tests only
	@echo "$(BLUE)Running leads tests...$(NC)"
	npm test -- tests/leads.test.ts

test-auth: ## Run auth tests only
	@echo "$(BLUE)Running auth tests...$(NC)"
	npm test -- tests/auth.test.ts

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm test -- --coverage

# =============================================================================
# DOCKER
# =============================================================================
docker-up: ## Start Docker containers (PostgreSQL, Redis, MinIO)
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	docker compose up -d

docker-down: ## Stop Docker containers
	@echo "$(YELLOW)Stopping Docker containers...$(NC)"
	docker compose down

docker-logs: ## Show Docker container logs
	docker compose logs -f

docker-ps: ## Show running containers
	docker compose ps

docker-restart: ## Restart Docker containers
	@echo "$(YELLOW)Restarting Docker containers...$(NC)"
	docker compose down && docker compose up -d

# =============================================================================
# DATABASE (PRISMA)
# =============================================================================
db-generate: ## Generate Prisma client
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	npx prisma generate

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	npx prisma migrate dev

db-migrate-reset: ## Reset database and run all migrations
	@echo "$(RED)Resetting database...$(NC)"
	npx prisma migrate reset --force

db-seed: ## Seed the database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run prisma:seed

db-studio: ## Open Prisma Studio (database GUI)
	@echo "$(GREEN)Opening Prisma Studio...$(NC)"
	npx prisma studio

db-push: ## Push schema changes without creating migration
	@echo "$(YELLOW)Pushing schema changes...$(NC)"
	npx prisma db push

# =============================================================================
# COMBINED COMMANDS
# =============================================================================
setup: docker-up ## Full setup: start docker, migrate, seed
	@echo "$(BLUE)Waiting for database to be ready...$(NC)"
	@sleep 3
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "$(GREEN)✓ Setup complete!$(NC)"

reset: docker-down ## Full reset: stop docker, clean, restart, migrate, seed
	@echo "$(RED)Cleaning up...$(NC)"
	@$(MAKE) clean
	@$(MAKE) docker-up
	@sleep 3
	@$(MAKE) db-migrate-reset
	@echo "$(GREEN)✓ Reset complete!$(NC)"

all: install docker-up db-migrate db-seed build test ## Run everything: install, docker, migrate, seed, build, test
	@echo "$(GREEN)✓ All tasks completed!$(NC)"

# =============================================================================
# CLEANUP
# =============================================================================
clean: ## Clean build artifacts and node_modules cache
	@echo "$(YELLOW)Cleaning...$(NC)"
	rm -rf dist
	rm -rf coverage
	rm -rf node_modules/.cache

clean-all: clean ## Clean everything including node_modules
	@echo "$(RED)Removing node_modules...$(NC)"
	rm -rf node_modules

# =============================================================================
# UTILITIES
# =============================================================================
check: ## Check TypeScript without emitting
	@echo "$(BLUE)Type checking...$(NC)"
	npx tsc --noEmit

logs: ## Show backend logs (when running in background)
	@tail -f logs/*.log 2>/dev/null || echo "No log files found"

port-kill: ## Kill process on port 3001
	@echo "$(YELLOW)Killing process on port 3001...$(NC)"
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No process on port 3001"
