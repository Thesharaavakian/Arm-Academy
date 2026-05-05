terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# EC2 Instance for Django application (free tier eligible)
resource "aws_instance" "django_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"  # Free tier eligible
  
  tags = {
    Name = "arm-academy-server"
  }
}

# RDS Database (free tier eligible)
resource "aws_db_instance" "postgresql" {
  allocated_storage    = 20  # Free tier: 20 GB
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.micro"  # Free tier eligible
  
  db_name              = var.db_name
  username             = var.db_username
  password             = var.db_password
  
  skip_final_snapshot  = true
  
  tags = {
    Name = "arm-academy-db"
  }
}

# S3 Bucket for video storage (free tier: 5 GB)
resource "aws_s3_bucket" "videos" {
  bucket = "arm-academy-videos-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "arm-academy-videos"
  }
}

# CloudFront Distribution for video CDN
resource "aws_cloudfront_distribution" "videos" {
  origin {
    domain_name = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id   = "s3-videos"
  }
  
  enabled = true
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-videos"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Data source for Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Outputs
output "django_server_ip" {
  value = aws_instance.django_server.public_ip
}

output "database_endpoint" {
  value = aws_db_instance.postgresql.endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.videos.bucket
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.videos.domain_name
}
