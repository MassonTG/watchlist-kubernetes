# Project 3 — Watchlist App on Kubernetes (k3s)

Full-stack app deployed on Kubernetes cluster on AWS EC2.

## Stack
Terraform · k3s · Kubernetes · Docker · FastAPI · PostgreSQL · Redis · Celery · Nginx

## Architecture
```
AWS EC2 (t3.small)
└── k3s cluster
    ├── fastapi     (2 replicas)
    ├── celery      (1 replica)
    ├── postgres    (StatefulSet + PersistentVolume)
    ├── redis       (1 replica)
    └── frontend    (Nginx, NodePort 30080)
```

## Deploy

### 1. Create infrastructure
```bash
cd terraform
terraform init
terraform apply -auto-approve
```

### 2. Build and upload images
```bash
docker build -t watchlist-backend:latest ./docker/backend
docker build -t watchlist-frontend:latest ./docker/frontend
docker save watchlist-backend:latest | gzip > /tmp/backend.tar.gz
docker save watchlist-frontend:latest | gzip > /tmp/frontend.tar.gz
scp -i ~/aws-key.pem /tmp/backend.tar.gz ubuntu@<IP>:/tmp/
scp -i ~/aws-key.pem /tmp/frontend.tar.gz ubuntu@<IP>:/tmp/
```

### 3. Import images to k3s
```bash
ssh -i ~/aws-key.pem ubuntu@<IP> "
  sudo k3s ctr images import /tmp/backend.tar.gz
  sudo k3s ctr images import /tmp/frontend.tar.gz
"
```

### 4. Deploy to Kubernetes
```bash
scp -i ~/aws-key.pem -r k8s ubuntu@<IP>:/tmp/
ssh -i ~/aws-key.pem ubuntu@<IP> "
  sudo k3s kubectl apply -f /tmp/k8s/namespace.yaml
  sudo k3s kubectl apply -f /tmp/k8s/configmap.yaml
  sudo k3s kubectl apply -f /tmp/k8s/secret.yaml
  sudo k3s kubectl apply -f /tmp/k8s/postgres.yaml
  sudo k3s kubectl apply -f /tmp/k8s/redis.yaml
  sudo k3s kubectl apply -f /tmp/k8s/fastapi.yaml
  sudo k3s kubectl apply -f /tmp/k8s/celery.yaml
  sudo k3s kubectl apply -f /tmp/k8s/frontend.yaml
"
```

### 5. Access
Open http://<public_ip>:30080

## Cleanup
```bash
terraform destroy -auto-approve
```
# SecureScan CI integrated
# test
# v2
