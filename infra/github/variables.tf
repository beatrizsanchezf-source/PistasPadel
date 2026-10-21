variable "github_owner" {
  description = "GitHub user or organization that owns the repository."
  type        = string
  default     = "beatrizsanchezf-source"
}

variable "repository_name" {
  description = "Existing GitHub repository to protect."
  type        = string
  default     = "PistasPadel"
}

variable "protected_branch" {
  description = "Branch to protect in the repository."
  type        = string
  default     = "main"
}

variable "required_approvals" {
  description = "Number of approving reviews required before merging."
  type        = number
  default     = 1

  validation {
    condition     = var.required_approvals >= 0 && var.required_approvals <= 6
    error_message = "required_approvals must be between 0 and 6."
  }
}
