# Prerequisities

Kubernetes 1.22+
helm 3.x


# NFS Setup Guide

## Prereq Rancher Desktop
rdctl shell sudo apk add nfs-utils

## Instructions
```
helm repo add openebs https://openebs.github.io/charts
helm repo update
helm install openebs openebs/openebs -n openebs --create-namespace --set nfs-provisioner.enabled=true
kubectl apply -f kubernetes/danswer/storage-class/storage-class-nfs.yaml
```

