resource "aws_vpc" "main" {
  cidr_block           = "10.40.0.0/16"
  instance_tenancy     = "default"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "order-platform-phase4-vpc"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_vpc.main
  id = "vpc-01f2e981ee69febad"
}


resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "order-platform-phase4-igw"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_internet_gateway.main
  id = "igw-03dcd901c5395fbf7"
}



resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.40.0.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = false

  tags = {
    Name = "order-platform-phase4-public-a"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.40.1.0/24"
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = false

  tags = {
    Name = "order-platform-phase4-public-b"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_subnet" "private_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.40.10.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = false

  tags = {
    Name = "order-platform-phase4-private-a"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_subnet" "private_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.40.11.0/24"
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = false

  tags = {
    Name = "order-platform-phase4-private-b"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_subnet.public_a
  id = "subnet-022206a94faffa567"
}

import {
  to = aws_subnet.public_b
  id = "subnet-03d602d500bb7f64a"
}

import {
  to = aws_subnet.private_a
  id = "subnet-0959a93361d698088"
}

import {
  to = aws_subnet.private_b
  id = "subnet-0462c591e5d829fdd"
}



resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "order-platform-phase4-public-rt"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "order-platform-phase4-private-rt"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_route_table.public
  id = "rtb-069097f89f8bd5070"
}

import {
  to = aws_route_table.private
  id = "rtb-0f14920dd8fddf372"
}


resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_route_table_association.public_a
  id = "subnet-022206a94faffa567/rtb-069097f89f8bd5070"
}

import {
  to = aws_route_table_association.public_b
  id = "subnet-03d602d500bb7f64a/rtb-069097f89f8bd5070"
}

import {
  to = aws_route_table_association.private_a
  id = "subnet-0959a93361d698088/rtb-0f14920dd8fddf372"
}

import {
  to = aws_route_table_association.private_b
  id = "subnet-0462c591e5d829fdd/rtb-0f14920dd8fddf372"
}


resource "aws_default_route_table" "main" {
  default_route_table_id = aws_vpc.main.default_route_table_id

  tags = {
    Name = "order-platform-phase4-main-rt"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_default_route_table.main
  id = "vpc-01f2e981ee69febad"
}

