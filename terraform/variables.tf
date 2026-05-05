variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "db_name" {
  description = "Database name"
  default     = "armacademy"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}
