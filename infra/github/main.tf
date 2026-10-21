terraform {
  required_version = ">= 1.6.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}

data "github_repository" "target" {
  full_name = "${var.github_owner}/${var.repository_name}"
}

resource "github_branch_protection" "main" {
  repository_id = data.github_repository.target.name
  pattern       = var.protected_branch

  enforce_admins                  = true
  allows_deletions                = false
  allows_force_pushes             = false
  required_linear_history         = true
  require_conversation_resolution = true

  required_pull_request_reviews {
    required_approving_review_count = var.required_approvals
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
  }
}
