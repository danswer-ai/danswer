<!--- app-name: NGINX Open Source -->

# Bitnami package for NGINX Open Source

NGINX Open Source is a web server that can be also used as a reverse proxy, load balancer, and HTTP cache. Recommended for high-demanding sites due to its ability to provide faster content.

[Overview of NGINX Open Source](http://nginx.org)

Trademarks: This software listing is packaged by Bitnami. The respective trademarks mentioned in the offering are owned by the respective companies, and use of them does not imply any affiliation or endorsement.

## TL;DR

```console
helm install my-release oci://registry-1.docker.io/bitnamicharts/nginx
```

Looking to use NGINX Open Source in production? Try [VMware Tanzu Application Catalog](https://bitnami.com/enterprise), the enterprise edition of Bitnami Application Catalog.

## Introduction

Bitnami charts for Helm are carefully engineered, actively maintained and are the quickest and easiest way to deploy containers on a Kubernetes cluster that are ready to handle production workloads.

This chart bootstraps a [NGINX Open Source](https://github.com/bitnami/containers/tree/main/bitnami/nginx) deployment on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

Bitnami charts can be used with [Kubeapps](https://kubeapps.dev/) for deployment and management of Helm Charts in clusters.

## Prerequisites

- Kubernetes 1.23+
- Helm 3.8.0+

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release oci://REGISTRY_NAME/REPOSITORY_NAME/nginx
```

> Note: You need to substitute the placeholders `REGISTRY_NAME` and `REPOSITORY_NAME` with a reference to your Helm chart registry and repository. For example, in the case of Bitnami, you need to use `REGISTRY_NAME=registry-1.docker.io` and `REPOSITORY_NAME=bitnamicharts`.

These commands deploy NGINX Open Source on the Kubernetes cluster in the default configuration.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

### Global parameters

| Name                                                  | Description                                                                                                                                                                                                                                                                                                                                                         | Value      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `global.imageRegistry`                                | Global Docker image registry                                                                                                                                                                                                                                                                                                                                        | `""`       |
| `global.imagePullSecrets`                             | Global Docker registry secret names as an array                                                                                                                                                                                                                                                                                                                     | `[]`       |
| `global.compatibility.openshift.adaptSecurityContext` | Adapt the securityContext sections of the deployment to make them compatible with Openshift restricted-v2 SCC: remove runAsUser, runAsGroup and fsGroup and let the platform use their allowed default IDs. Possible values: auto (apply if the detected running cluster is Openshift), force (perform the adaptation always), disabled (do not perform adaptation) | `disabled` |

### Common parameters

| Name                     | Description                                                                             | Value           |
| ------------------------ | --------------------------------------------------------------------------------------- | --------------- |
| `nameOverride`           | String to partially override nginx.fullname template (will maintain the release name)   | `""`            |
| `fullnameOverride`       | String to fully override nginx.fullname template                                        | `""`            |
| `namespaceOverride`      | String to fully override common.names.namespace                                         | `""`            |
| `kubeVersion`            | Force target Kubernetes version (using Helm capabilities if not set)                    | `""`            |
| `clusterDomain`          | Kubernetes Cluster Domain                                                               | `cluster.local` |
| `extraDeploy`            | Extra objects to deploy (value evaluated as a template)                                 | `[]`            |
| `commonLabels`           | Add labels to all the deployed resources                                                | `{}`            |
| `commonAnnotations`      | Add annotations to all the deployed resources                                           | `{}`            |
| `diagnosticMode.enabled` | Enable diagnostic mode (all probes will be disabled and the command will be overridden) | `false`         |
| `diagnosticMode.command` | Command to override all containers in the the deployment(s)/statefulset(s)              | `["sleep"]`     |
| `diagnosticMode.args`    | Args to override all containers in the the deployment(s)/statefulset(s)                 | `["infinity"]`  |

### NGINX parameters

| Name                           | Description                                                                                           | Value                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| `image.registry`               | NGINX image registry                                                                                  | `REGISTRY_NAME`         |
| `image.repository`             | NGINX image repository                                                                                | `REPOSITORY_NAME/nginx` |
| `image.digest`                 | NGINX image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag | `""`                    |
| `image.pullPolicy`             | NGINX image pull policy                                                                               | `IfNotPresent`          |
| `image.pullSecrets`            | Specify docker-registry secret names as an array                                                      | `[]`                    |
| `image.debug`                  | Set to true if you would like to see extra information on logs                                        | `false`                 |
| `automountServiceAccountToken` | Mount Service Account token in pod                                                                    | `false`                 |
| `hostAliases`                  | Deployment pod host aliases                                                                           | `[]`                    |
| `command`                      | Override default container command (useful when using custom images)                                  | `[]`                    |
| `args`                         | Override default container args (useful when using custom images)                                     | `[]`                    |
| `extraEnvVars`                 | Extra environment variables to be set on NGINX containers                                             | `[]`                    |
| `extraEnvVarsCM`               | ConfigMap with extra environment variables                                                            | `""`                    |
| `extraEnvVarsSecret`           | Secret with extra environment variables                                                               | `""`                    |

### NGINX deployment parameters

| Name                                                | Description                                                                                                                                                                                                | Value            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `replicaCount`                                      | Number of NGINX replicas to deploy                                                                                                                                                                         | `1`              |
| `revisionHistoryLimit`                              | The number of old history to retain to allow rollback                                                                                                                                                      | `10`             |
| `updateStrategy.type`                               | NGINX deployment strategy type                                                                                                                                                                             | `RollingUpdate`  |
| `updateStrategy.rollingUpdate`                      | NGINX deployment rolling update configuration parameters                                                                                                                                                   | `{}`             |
| `podLabels`                                         | Additional labels for NGINX pods                                                                                                                                                                           | `{}`             |
| `podAnnotations`                                    | Annotations for NGINX pods                                                                                                                                                                                 | `{}`             |
| `podAffinityPreset`                                 | Pod affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                                        | `""`             |
| `podAntiAffinityPreset`                             | Pod anti-affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                                   | `soft`           |
| `nodeAffinityPreset.type`                           | Node affinity preset type. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                                  | `""`             |
| `nodeAffinityPreset.key`                            | Node label key to match Ignored if `affinity` is set.                                                                                                                                                      | `""`             |
| `nodeAffinityPreset.values`                         | Node label values to match. Ignored if `affinity` is set.                                                                                                                                                  | `[]`             |
| `affinity`                                          | Affinity for pod assignment                                                                                                                                                                                | `{}`             |
| `hostNetwork`                                       | Specify if host network should be enabled for NGINX pod                                                                                                                                                    | `false`          |
| `hostIPC`                                           | Specify if host IPC should be enabled for NGINX pod                                                                                                                                                        | `false`          |
| `nodeSelector`                                      | Node labels for pod assignment. Evaluated as a template.                                                                                                                                                   | `{}`             |
| `tolerations`                                       | Tolerations for pod assignment. Evaluated as a template.                                                                                                                                                   | `[]`             |
| `priorityClassName`                                 | NGINX pods' priorityClassName                                                                                                                                                                              | `""`             |
| `schedulerName`                                     | Name of the k8s scheduler (other than default)                                                                                                                                                             | `""`             |
| `terminationGracePeriodSeconds`                     | In seconds, time the given to the NGINX pod needs to terminate gracefully                                                                                                                                  | `""`             |
| `topologySpreadConstraints`                         | Topology Spread Constraints for pod assignment                                                                                                                                                             | `[]`             |
| `podSecurityContext.enabled`                        | Enabled NGINX pods' Security Context                                                                                                                                                                       | `true`           |
| `podSecurityContext.fsGroupChangePolicy`            | Set filesystem group change policy                                                                                                                                                                         | `Always`         |
| `podSecurityContext.supplementalGroups`             | Set filesystem extra groups                                                                                                                                                                                | `[]`             |
| `podSecurityContext.fsGroup`                        | Set NGINX pod's Security Context fsGroup                                                                                                                                                                   | `1001`           |
| `podSecurityContext.sysctls`                        | sysctl settings of the NGINX pods                                                                                                                                                                          | `[]`             |
| `containerSecurityContext.enabled`                  | Enabled containers' Security Context                                                                                                                                                                       | `true`           |
| `containerSecurityContext.seLinuxOptions`           | Set SELinux options in container                                                                                                                                                                           | `nil`            |
| `containerSecurityContext.runAsUser`                | Set containers' Security Context runAsUser                                                                                                                                                                 | `1001`           |
| `containerSecurityContext.runAsGroup`               | Set containers' Security Context runAsGroup                                                                                                                                                                | `0`              |
| `containerSecurityContext.runAsNonRoot`             | Set container's Security Context runAsNonRoot                                                                                                                                                              | `true`           |
| `containerSecurityContext.privileged`               | Set container's Security Context privileged                                                                                                                                                                | `false`          |
| `containerSecurityContext.readOnlyRootFilesystem`   | Set container's Security Context readOnlyRootFilesystem                                                                                                                                                    | `false`          |
| `containerSecurityContext.allowPrivilegeEscalation` | Set container's Security Context allowPrivilegeEscalation                                                                                                                                                  | `false`          |
| `containerSecurityContext.capabilities.drop`        | List of capabilities to be dropped                                                                                                                                                                         | `["ALL"]`        |
| `containerSecurityContext.seccompProfile.type`      | Set container's Security Context seccomp profile                                                                                                                                                           | `RuntimeDefault` |
| `containerPorts.http`                               | Sets http port inside NGINX container                                                                                                                                                                      | `8080`           |
| `containerPorts.https`                              | Sets https port inside NGINX container                                                                                                                                                                     | `""`             |
| `extraContainerPorts`                               | Array of additional container ports for the Nginx container                                                                                                                                                | `[]`             |
| `resourcesPreset`                                   | Set container resources according to one common preset (allowed values: none, nano, small, medium, large, xlarge, 2xlarge). This is ignored if resources is set (resources is recommended for production). | `none`           |
| `resources`                                         | Set container requests and limits for different resources like CPU or memory (essential for production workloads)                                                                                          | `{}`             |
| `lifecycleHooks`                                    | Optional lifecycleHooks for the NGINX container                                                                                                                                                            | `{}`             |
| `startupProbe.enabled`                              | Enable startupProbe                                                                                                                                                                                        | `false`          |
| `startupProbe.initialDelaySeconds`                  | Initial delay seconds for startupProbe                                                                                                                                                                     | `30`             |
| `startupProbe.periodSeconds`                        | Period seconds for startupProbe                                                                                                                                                                            | `10`             |
| `startupProbe.timeoutSeconds`                       | Timeout seconds for startupProbe                                                                                                                                                                           | `5`              |
| `startupProbe.failureThreshold`                     | Failure threshold for startupProbe                                                                                                                                                                         | `6`              |
| `startupProbe.successThreshold`                     | Success threshold for startupProbe                                                                                                                                                                         | `1`              |
| `livenessProbe.enabled`                             | Enable livenessProbe                                                                                                                                                                                       | `true`           |
| `livenessProbe.initialDelaySeconds`                 | Initial delay seconds for livenessProbe                                                                                                                                                                    | `30`             |
| `livenessProbe.periodSeconds`                       | Period seconds for livenessProbe                                                                                                                                                                           | `10`             |
| `livenessProbe.timeoutSeconds`                      | Timeout seconds for livenessProbe                                                                                                                                                                          | `5`              |
| `livenessProbe.failureThreshold`                    | Failure threshold for livenessProbe                                                                                                                                                                        | `6`              |
| `livenessProbe.successThreshold`                    | Success threshold for livenessProbe                                                                                                                                                                        | `1`              |
| `readinessProbe.enabled`                            | Enable readinessProbe                                                                                                                                                                                      | `true`           |
| `readinessProbe.initialDelaySeconds`                | Initial delay seconds for readinessProbe                                                                                                                                                                   | `5`              |
| `readinessProbe.periodSeconds`                      | Period seconds for readinessProbe                                                                                                                                                                          | `5`              |
| `readinessProbe.timeoutSeconds`                     | Timeout seconds for readinessProbe                                                                                                                                                                         | `3`              |
| `readinessProbe.failureThreshold`                   | Failure threshold for readinessProbe                                                                                                                                                                       | `3`              |
| `readinessProbe.successThreshold`                   | Success threshold for readinessProbe                                                                                                                                                                       | `1`              |
| `customStartupProbe`                                | Custom liveness probe for the Web component                                                                                                                                                                | `{}`             |
| `customLivenessProbe`                               | Override default liveness probe                                                                                                                                                                            | `{}`             |
| `customReadinessProbe`                              | Override default readiness probe                                                                                                                                                                           | `{}`             |
| `autoscaling.enabled`                               | Enable autoscaling for NGINX deployment                                                                                                                                                                    | `false`          |
| `autoscaling.minReplicas`                           | Minimum number of replicas to scale back                                                                                                                                                                   | `""`             |
| `autoscaling.maxReplicas`                           | Maximum number of replicas to scale out                                                                                                                                                                    | `""`             |
| `autoscaling.targetCPU`                             | Target CPU utilization percentage                                                                                                                                                                          | `""`             |
| `autoscaling.targetMemory`                          | Target Memory utilization percentage                                                                                                                                                                       | `""`             |
| `extraVolumes`                                      | Array to add extra volumes                                                                                                                                                                                 | `[]`             |
| `extraVolumeMounts`                                 | Array to add extra mount                                                                                                                                                                                   | `[]`             |
| `serviceAccount.create`                             | Enable creation of ServiceAccount for nginx pod                                                                                                                                                            | `true`           |
| `serviceAccount.name`                               | The name of the ServiceAccount to use.                                                                                                                                                                     | `""`             |
| `serviceAccount.annotations`                        | Annotations for service account. Evaluated as a template.                                                                                                                                                  | `{}`             |
| `serviceAccount.automountServiceAccountToken`       | Auto-mount the service account token in the pod                                                                                                                                                            | `false`          |
| `sidecars`                                          | Sidecar parameters                                                                                                                                                                                         | `[]`             |
| `sidecarSingleProcessNamespace`                     | Enable sharing the process namespace with sidecars                                                                                                                                                         | `false`          |
| `initContainers`                                    | Extra init containers                                                                                                                                                                                      | `[]`             |
| `pdb.create`                                        | Created a PodDisruptionBudget                                                                                                                                                                              | `false`          |
| `pdb.minAvailable`                                  | Min number of pods that must still be available after the eviction.                                                                                                                                        | `1`              |
| `pdb.maxUnavailable`                                | Max number of pods that can be unavailable after the eviction.                                                                                                                                             | `0`              |

### Custom NGINX application parameters

| Name                                             | Description                                                                                                                                                                                                                                                              | Value                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `cloneStaticSiteFromGit.enabled`                 | Get the server static content from a Git repository                                                                                                                                                                                                                      | `false`               |
| `cloneStaticSiteFromGit.image.registry`          | Git image registry                                                                                                                                                                                                                                                       | `REGISTRY_NAME`       |
| `cloneStaticSiteFromGit.image.repository`        | Git image repository                                                                                                                                                                                                                                                     | `REPOSITORY_NAME/git` |
| `cloneStaticSiteFromGit.image.digest`            | Git image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                                                                                                                                                                      | `""`                  |
| `cloneStaticSiteFromGit.image.pullPolicy`        | Git image pull policy                                                                                                                                                                                                                                                    | `IfNotPresent`        |
| `cloneStaticSiteFromGit.image.pullSecrets`       | Specify docker-registry secret names as an array                                                                                                                                                                                                                         | `[]`                  |
| `cloneStaticSiteFromGit.repository`              | Git Repository to clone static content from                                                                                                                                                                                                                              | `""`                  |
| `cloneStaticSiteFromGit.branch`                  | Git branch to checkout                                                                                                                                                                                                                                                   | `""`                  |
| `cloneStaticSiteFromGit.interval`                | Interval for sidecar container pull from the Git repository                                                                                                                                                                                                              | `60`                  |
| `cloneStaticSiteFromGit.gitClone.command`        | Override default container command for git-clone-repository                                                                                                                                                                                                              | `[]`                  |
| `cloneStaticSiteFromGit.gitClone.args`           | Override default container args for git-clone-repository                                                                                                                                                                                                                 | `[]`                  |
| `cloneStaticSiteFromGit.gitSync.command`         | Override default container command for git-repo-syncer                                                                                                                                                                                                                   | `[]`                  |
| `cloneStaticSiteFromGit.gitSync.args`            | Override default container args for git-repo-syncer                                                                                                                                                                                                                      | `[]`                  |
| `cloneStaticSiteFromGit.gitSync.resourcesPreset` | Set container resources according to one common preset (allowed values: none, nano, small, medium, large, xlarge, 2xlarge). This is ignored if cloneStaticSiteFromGit.gitSync.resources is set (cloneStaticSiteFromGit.gitSync.resources is recommended for production). | `none`                |
| `cloneStaticSiteFromGit.gitSync.resources`       | Set container requests and limits for different resources like CPU or memory (essential for production workloads)                                                                                                                                                        | `{}`                  |
| `cloneStaticSiteFromGit.extraEnvVars`            | Additional environment variables to set for the in the containers that clone static site from git                                                                                                                                                                        | `[]`                  |
| `cloneStaticSiteFromGit.extraEnvVarsSecret`      | Secret with extra environment variables                                                                                                                                                                                                                                  | `""`                  |
| `cloneStaticSiteFromGit.extraVolumeMounts`       | Add extra volume mounts for the Git containers                                                                                                                                                                                                                           | `[]`                  |
| `serverBlock`                                    | Custom server block to be added to NGINX configuration                                                                                                                                                                                                                   | `""`                  |
| `existingServerBlockConfigmap`                   | ConfigMap with custom server block to be added to NGINX configuration                                                                                                                                                                                                    | `""`                  |
| `staticSiteConfigmap`                            | Name of existing ConfigMap with the server static site content                                                                                                                                                                                                           | `""`                  |
| `staticSitePVC`                                  | Name of existing PVC with the server static site content                                                                                                                                                                                                                 | `""`                  |

### Traffic Exposure parameters

| Name                                    | Description                                                                                                                      | Value                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `service.type`                          | Service type                                                                                                                     | `LoadBalancer`           |
| `service.ports.http`                    | Service HTTP port                                                                                                                | `80`                     |
| `service.ports.https`                   | Service HTTPS port                                                                                                               | `443`                    |
| `service.nodePorts`                     | Specify the nodePort(s) value(s) for the LoadBalancer and NodePort service types.                                                | `{}`                     |
| `service.targetPort`                    | Target port reference value for the Loadbalancer service types can be specified explicitly.                                      | `{}`                     |
| `service.clusterIP`                     | NGINX service Cluster IP                                                                                                         | `""`                     |
| `service.loadBalancerIP`                | LoadBalancer service IP address                                                                                                  | `""`                     |
| `service.loadBalancerSourceRanges`      | NGINX service Load Balancer sources                                                                                              | `[]`                     |
| `service.loadBalancerClass`             | service Load Balancer class if service type is `LoadBalancer` (optional, cloud specific)                                         | `""`                     |
| `service.extraPorts`                    | Extra ports to expose (normally used with the `sidecar` value)                                                                   | `[]`                     |
| `service.sessionAffinity`               | Session Affinity for Kubernetes service, can be "None" or "ClientIP"                                                             | `None`                   |
| `service.sessionAffinityConfig`         | Additional settings for the sessionAffinity                                                                                      | `{}`                     |
| `service.annotations`                   | Service annotations                                                                                                              | `{}`                     |
| `service.externalTrafficPolicy`         | Enable client source IP preservation                                                                                             | `Cluster`                |
| `networkPolicy.enabled`                 | Specifies whether a NetworkPolicy should be created                                                                              | `true`                   |
| `networkPolicy.allowExternal`           | Don't require server label for connections                                                                                       | `true`                   |
| `networkPolicy.allowExternalEgress`     | Allow the pod to access any range of port and all destinations.                                                                  | `true`                   |
| `networkPolicy.extraIngress`            | Add extra ingress rules to the NetworkPolice                                                                                     | `[]`                     |
| `networkPolicy.extraEgress`             | Add extra ingress rules to the NetworkPolicy (ignored if allowExternalEgress=true)                                               | `[]`                     |
| `networkPolicy.ingressNSMatchLabels`    | Labels to match to allow traffic from other namespaces                                                                           | `{}`                     |
| `networkPolicy.ingressNSPodMatchLabels` | Pod labels to match to allow traffic from other namespaces                                                                       | `{}`                     |
| `ingress.enabled`                       | Set to true to enable ingress record generation                                                                                  | `false`                  |
| `ingress.selfSigned`                    | Create a TLS secret for this ingress record using self-signed certificates generated by Helm                                     | `false`                  |
| `ingress.pathType`                      | Ingress path type                                                                                                                | `ImplementationSpecific` |
| `ingress.apiVersion`                    | Force Ingress API version (automatically detected if not set)                                                                    | `""`                     |
| `ingress.hostname`                      | Default host for the ingress resource                                                                                            | `nginx.local`            |
| `ingress.path`                          | The Path to Nginx. You may need to set this to '/*' in order to use this with ALB ingress controllers.                           | `/`                      |
| `ingress.annotations`                   | Additional annotations for the Ingress resource. To enable certificate autogeneration, place here your cert-manager annotations. | `{}`                     |
| `ingress.ingressClassName`              | Set the ingerssClassName on the ingress record for k8s 1.18+                                                                     | `""`                     |
| `ingress.tls`                           | Create TLS Secret                                                                                                                | `false`                  |
| `ingress.tlsWwwPrefix`                  | Adds www subdomain to default cert                                                                                               | `false`                  |
| `ingress.extraHosts`                    | The list of additional hostnames to be covered with this ingress record.                                                         | `[]`                     |
| `ingress.extraPaths`                    | Any additional arbitrary paths that may need to be added to the ingress under the main host.                                     | `[]`                     |
| `ingress.extraTls`                      | The tls configuration for additional hostnames to be covered with this ingress record.                                           | `[]`                     |
| `ingress.secrets`                       | If you're providing your own certificates, please use this to add the certificates as secrets                                    | `[]`                     |
| `ingress.extraRules`                    | The list of additional rules to be added to this ingress record. Evaluated as a template                                         | `[]`                     |
| `healthIngress.enabled`                 | Set to true to enable health ingress record generation                                                                           | `false`                  |
| `healthIngress.selfSigned`              | Create a TLS secret for this ingress record using self-signed certificates generated by Helm                                     | `false`                  |
| `healthIngress.pathType`                | Ingress path type                                                                                                                | `ImplementationSpecific` |
| `healthIngress.hostname`                | When the health ingress is enabled, a host pointing to this will be created                                                      | `example.local`          |
| `healthIngress.path`                    | Default path for the ingress record                                                                                              | `/`                      |
| `healthIngress.annotations`             | Additional annotations for the Ingress resource. To enable certificate autogeneration, place here your cert-manager annotations. | `{}`                     |
| `healthIngress.tls`                     | Enable TLS configuration for the hostname defined at `healthIngress.hostname` parameter                                          | `false`                  |
| `healthIngress.extraHosts`              | An array with additional hostname(s) to be covered with the ingress record                                                       | `[]`                     |
| `healthIngress.extraPaths`              | An array with additional arbitrary paths that may need to be added to the ingress under the main host                            | `[]`                     |
| `healthIngress.extraTls`                | TLS configuration for additional hostnames to be covered                                                                         | `[]`                     |
| `healthIngress.secrets`                 | TLS Secret configuration                                                                                                         | `[]`                     |
| `healthIngress.ingressClassName`        | IngressClass that will be be used to implement the Ingress (Kubernetes 1.18+)                                                    | `""`                     |
| `healthIngress.extraRules`              | The list of additional rules to be added to this ingress record. Evaluated as a template                                         | `[]`                     |

### Metrics parameters

| Name                                       | Description                                                                                                                                                                                                                | Value                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `metrics.enabled`                          | Start a Prometheus exporter sidecar container                                                                                                                                                                              | `false`                          |
| `metrics.image.registry`                   | NGINX Prometheus exporter image registry                                                                                                                                                                                   | `REGISTRY_NAME`                  |
| `metrics.image.repository`                 | NGINX Prometheus exporter image repository                                                                                                                                                                                 | `REPOSITORY_NAME/nginx-exporter` |
| `metrics.image.digest`                     | NGINX Prometheus exporter image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                                                                                                  | `""`                             |
| `metrics.image.pullPolicy`                 | NGINX Prometheus exporter image pull policy                                                                                                                                                                                | `IfNotPresent`                   |
| `metrics.image.pullSecrets`                | Specify docker-registry secret names as an array                                                                                                                                                                           | `[]`                             |
| `metrics.port`                             | NGINX Container Status Port scraped by Prometheus Exporter                                                                                                                                                                 | `""`                             |
| `metrics.extraArgs`                        | Extra arguments for Prometheus exporter                                                                                                                                                                                    | `[]`                             |
| `metrics.containerPorts.metrics`           | Prometheus exporter container port                                                                                                                                                                                         | `9113`                           |
| `metrics.podAnnotations`                   | Additional annotations for NGINX Prometheus exporter pod(s)                                                                                                                                                                | `{}`                             |
| `metrics.securityContext.enabled`          | Enabled NGINX Exporter containers' Security Context                                                                                                                                                                        | `false`                          |
| `metrics.securityContext.seLinuxOptions`   | Set SELinux options in container                                                                                                                                                                                           | `nil`                            |
| `metrics.securityContext.runAsUser`        | Set NGINX Exporter container's Security Context runAsUser                                                                                                                                                                  | `1001`                           |
| `metrics.service.port`                     | NGINX Prometheus exporter service port                                                                                                                                                                                     | `9113`                           |
| `metrics.service.annotations`              | Annotations for the Prometheus exporter service                                                                                                                                                                            | `{}`                             |
| `metrics.resourcesPreset`                  | Set container resources according to one common preset (allowed values: none, nano, small, medium, large, xlarge, 2xlarge). This is ignored if metrics.resources is set (metrics.resources is recommended for production). | `none`                           |
| `metrics.resources`                        | Set container requests and limits for different resources like CPU or memory (essential for production workloads)                                                                                                          | `{}`                             |
| `metrics.serviceMonitor.enabled`           | Creates a Prometheus Operator ServiceMonitor (also requires `metrics.enabled` to be `true`)                                                                                                                                | `false`                          |
| `metrics.serviceMonitor.namespace`         | Namespace in which Prometheus is running                                                                                                                                                                                   | `""`                             |
| `metrics.serviceMonitor.jobLabel`          | The name of the label on the target service to use as the job name in prometheus.                                                                                                                                          | `""`                             |
| `metrics.serviceMonitor.interval`          | Interval at which metrics should be scraped.                                                                                                                                                                               | `""`                             |
| `metrics.serviceMonitor.scrapeTimeout`     | Timeout after which the scrape is ended                                                                                                                                                                                    | `""`                             |
| `metrics.serviceMonitor.selector`          | Prometheus instance selector labels                                                                                                                                                                                        | `{}`                             |
| `metrics.serviceMonitor.labels`            | Additional labels that can be used so PodMonitor will be discovered by Prometheus                                                                                                                                          | `{}`                             |
| `metrics.serviceMonitor.relabelings`       | RelabelConfigs to apply to samples before scraping                                                                                                                                                                         | `[]`                             |
| `metrics.serviceMonitor.metricRelabelings` | MetricRelabelConfigs to apply to samples before ingestion                                                                                                                                                                  | `[]`                             |
| `metrics.serviceMonitor.honorLabels`       | honorLabels chooses the metric's labels on collisions with target labels                                                                                                                                                   | `false`                          |
| `metrics.prometheusRule.enabled`           | if `true`, creates a Prometheus Operator PrometheusRule (also requires `metrics.enabled` to be `true` and `metrics.prometheusRule.rules`)                                                                                  | `false`                          |
| `metrics.prometheusRule.namespace`         | Namespace for the PrometheusRule Resource (defaults to the Release Namespace)                                                                                                                                              | `""`                             |
| `metrics.prometheusRule.additionalLabels`  | Additional labels that can be used so PrometheusRule will be discovered by Prometheus                                                                                                                                      | `{}`                             |
| `metrics.prometheusRule.rules`             | Prometheus Rule definitions                                                                                                                                                                                                | `[]`                             |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
helm install my-release \
  --set imagePullPolicy=Always \
    oci://REGISTRY_NAME/REPOSITORY_NAME/nginx
```

> Note: You need to substitute the placeholders `REGISTRY_NAME` and `REPOSITORY_NAME` with a reference to your Helm chart registry and repository. For example, in the case of Bitnami, you need to use `REGISTRY_NAME=registry-1.docker.io` and `REPOSITORY_NAME=bitnamicharts`.

The above command sets the `imagePullPolicy` to `Always`.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```console
helm install my-release -f values.yaml oci://REGISTRY_NAME/REPOSITORY_NAME/nginx
```

> Note: You need to substitute the placeholders `REGISTRY_NAME` and `REPOSITORY_NAME` with a reference to your Helm chart registry and repository. For example, in the case of Bitnami, you need to use `REGISTRY_NAME=registry-1.docker.io` and `REPOSITORY_NAME=bitnamicharts`.
> **Tip**: You can use the default [values.yaml](https://github.com/bitnami/charts/tree/main/bitnami/nginx/values.yaml)

## Configuration and installation details

### Resource requests and limits

Bitnami charts allow setting resource requests and limits for all containers inside the chart deployment. These are inside the `resources` value (check parameter table). Setting requests is essential for production workloads and these should be adapted to your specific use case.

To make this process easier, the chart contains the `resourcesPreset` values, which automatically sets the `resources` section according to different presets. Check these presets in [the bitnami/common chart](https://github.com/bitnami/charts/blob/main/bitnami/common/templates/_resources.tpl#L15). However, in production workloads using `resourcePreset` is discouraged as it may not fully adapt to your specific needs. Find more information on container resource management in the [official Kubernetes documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).

### [Rolling VS Immutable tags](https://docs.bitnami.com/tutorials/understand-rolling-tags-containers)

It is strongly recommended to use immutable tags in a production environment. This ensures your deployment does not change automatically if the same tag is updated with a different image.

Bitnami will release a new chart updating its containers if a new version of the main container, significant changes, or critical vulnerabilities exist.

### Use a different NGINX version

To modify the application version used in this chart, specify a different version of the image using the `image.tag` parameter and/or a different repository using the `image.repository` parameter.

### Deploying your custom web application

The NGINX chart allows you to deploy a custom web application using one of the following methods:

- Cloning from a git repository: Set `cloneStaticSiteFromGit.enabled` to `true` and set the repository and branch using the `cloneStaticSiteFromGit.repository` and `cloneStaticSiteFromGit.branch` parameters. A sidecar will also pull the latest changes in an interval set by `cloneStaticSitesFromGit.interval`.
- Providing a ConfigMap: Set the `staticSiteConfigmap` value to mount a ConfigMap in the NGINX html folder.
- Using an existing PVC: Set the `staticSitePVC` value to mount an PersistentVolumeClaim with the static site content.

You can deploy a example web application using git deploying the chart with the following parameters:

```console
cloneStaticSiteFromGit.enabled=true
cloneStaticSiteFromGit.repository=https://github.com/mdn/beginner-html-site-styled.git
cloneStaticSiteFromGit.branch=master
```

### Providing a custom server block

This helm chart supports using custom custom server block for NGINX to use.

You can use the `serverBlock` value to provide a custom server block for NGINX to use. To do this, create a values files with your server block and install the chart using it:

```yaml
serverBlock: |-
  server {
    listen 0.0.0.0:8080;
    location / {
      return 200 "hello!";
    }
  }
```

> Warning: The above example is not compatible with enabling Prometheus metrics since it affects the `/status` endpoint.

In addition, you can also set an external ConfigMap with the configuration file. This is done by setting the `existingServerBlockConfigmap` parameter. Note that this will override the previous option.

### Adding extra environment variables

In case you want to add extra environment variables (useful for advanced operations like custom init scripts), you can use the `extraEnvVars` property.

```yaml
extraEnvVars:
  - name: LOG_LEVEL
    value: error
```

Alternatively, you can use a ConfigMap or a Secret with the environment variables. To do so, use the `extraEnvVarsCM` or the `extraEnvVarsSecret` values.

### Setting Pod's affinity

This chart allows you to set your custom affinity using the `affinity` parameter. Find more information about Pod's affinity in the [kubernetes documentation](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity).

As an alternative, you can use of the preset configurations for pod affinity, pod anti-affinity, and node affinity available at the [bitnami/common](https://github.com/bitnami/charts/tree/main/bitnami/common#affinity) chart. To do so, set the `podAffinityPreset`, `podAntiAffinityPreset`, or `nodeAffinityPreset` parameters.

### Deploying extra resources

There are cases where you may want to deploy extra objects, such a ConfigMap containing your app's configuration or some extra deployment with a micro service used by your app. For covering this case, the chart allows adding the full specification of other objects using the `extraDeploy` parameter.

### Ingress

This chart provides support for ingress resources. If you have an ingress controller installed on your cluster, such as [nginx-ingress-controller](https://github.com/bitnami/charts/tree/main/bitnami/nginx-ingress-controller) or [contour](https://github.com/bitnami/charts/tree/main/bitnami/contour) you can utilize the ingress controller to serve your application.

To enable ingress integration, please set `ingress.enabled` to `true`.

#### Hosts

Most likely you will only want to have one hostname that maps to this NGINX installation. If that's your case, the property `ingress.hostname` will set it. However, it is possible to have more than one host. To facilitate this, the `ingress.extraHosts` object can be specified as an array. You can also use `ingress.extraTLS` to add the TLS configuration for extra hosts.

For each host indicated at `ingress.extraHosts`, please indicate a `name`, `path`, and any `annotations` that you may want the ingress controller to know about.

For annotations, please see [this document](https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md). Not all annotations are supported by all ingress controllers, but this document does a good job of indicating which annotation is supported by many popular ingress controllers.

## Troubleshooting

Find more information about how to deal with common errors related to Bitnami's Helm charts in [this troubleshooting guide](https://docs.bitnami.com/general/how-to/troubleshoot-helm-chart-issues).

## Upgrading

### To 11.0.0

This major release renames several values in this chart and adds missing features, in order to be aligned with the rest of the assets in the Bitnami charts repository.

Affected values:

- `service.port` was renamed as `service.ports.http`.
- `service.httpsPort` was deprecated. We recommend using `service.ports.https`.
- `serviceAccount.autoMount` was renamed as `serviceAccount.automountServiceAccountToken`
- `metrics.serviceMonitor.additionalLabels` was renamed as `metrics.serviceMonitor.labels`

### To 10.0.0

This major release no longer uses the bitnami/nginx-ldap-auth-daemon container as a dependency since its upstream project is not actively maintained.

*2022-04-12 edit*:

[Bitnami's reference implementation](https://www.nginx.com/blog/nginx-plus-authenticate-users/).

On 9 April 2022, security vulnerabilities in the [NGINX LDAP reference implementation](https://github.com/nginxinc/nginx-ldap-auth) were publicly shared. **Although the deprecation of this container from the Bitnami catalog was not related to this security issue, [here](https://docs.bitnami.com/general/security/) you can find more information from the Bitnami security team.**

### To 8.0.0

[On November 13, 2020, Helm v2 support was formally finished](https://github.com/helm/charts#status-of-the-project), this major version is the result of the required changes applied to the Helm Chart to be able to incorporate the different features added in Helm v3 and to be consistent with the Helm project itself regarding the Helm v2 EOL.

#### What changes were introduced in this major version?

- Previous versions of this Helm Chart use `apiVersion: v1` (installable by both Helm 2 and 3), this Helm Chart was updated to `apiVersion: v2` (installable by Helm 3 only). [Here](https://helm.sh/docs/topics/charts/#the-apiversion-field) you can find more information about the `apiVersion` field.
- Move dependency information from the *requirements.yaml* to the *Chart.yaml*
- After running `helm dependency update`, a *Chart.lock* file is generated containing the same structure used in the previous *requirements.lock*
- The different fields present in the *Chart.yaml* file has been ordered alphabetically in a homogeneous way for all the Bitnami Helm Charts

#### Considerations when upgrading to this version

- If you want to upgrade to this version from a previous one installed with Helm v3, you shouldn't face any issues
- If you want to upgrade to this version using Helm v2, this scenario is not supported as this version doesn't support Helm v2 anymore
- If you installed the previous version with Helm v2 and wants to upgrade to this version with Helm v3, please refer to the [official Helm documentation](https://helm.sh/docs/topics/v2_v3_migration/#migration-use-cases) about migrating from Helm v2 to v3

#### Useful links

- <https://docs.bitnami.com/tutorials/resolve-helm2-helm3-post-migration-issues/>
- <https://helm.sh/docs/topics/v2_v3_migration/>
- <https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/>

### To 7.0.0

- This version also introduces `bitnami/common`, a [library chart](https://helm.sh/docs/topics/library_charts/#helm) as a dependency. More documentation about this new utility could be found [here](https://github.com/bitnami/charts/tree/main/bitnami/common#bitnami-common-library-chart). Please, make sure that you have updated the chart dependencies before executing any upgrade.
- Ingress configuration was also adapted to follow the Helm charts best practices.

> Note: There is no backwards compatibility due to the above mentioned changes. It's necessary to install a new release of the chart, and migrate your existing application to the new NGINX instances.

### To 5.6.0

Added support for the use of LDAP.

### To 5.0.0

Backwards compatibility is not guaranteed unless you modify the labels used on the chart's deployments.
Use the workaround below to upgrade from versions previous to 5.0.0. The following example assumes that the release name is nginx:

```console
kubectl delete deployment nginx --cascade=false
helm upgrade nginx oci://REGISTRY_NAME/REPOSITORY_NAME/nginx
```

> Note: You need to substitute the placeholders `REGISTRY_NAME` and `REPOSITORY_NAME` with a reference to your Helm chart registry and repository. For example, in the case of Bitnami, you need to use `REGISTRY_NAME=registry-1.docker.io` and `REPOSITORY_NAME=bitnamicharts`.

### To 1.0.0

Backwards compatibility is not guaranteed unless you modify the labels used on the chart's deployments.
Use the workaround below to upgrade from versions previous to 1.0.0. The following example assumes that the release name is nginx:

```console
kubectl patch deployment nginx --type=json -p='[{"op": "remove", "path": "/spec/selector/matchLabels/chart"}]'
```

## Bitnami Kubernetes Documentation

Bitnami Kubernetes documentation is available at [https://docs.bitnami.com/](https://docs.bitnami.com/). You can find there the following resources:

- [Documentation for NGINX Helm chart](https://github.com/bitnami/charts/tree/main/bitnami/nginx)
- [Get Started with Kubernetes guides](https://docs.bitnami.com/kubernetes/)
- [Kubernetes FAQs](https://docs.bitnami.com/kubernetes/faq/)
- [Kubernetes Developer guides](https://docs.bitnami.com/tutorials/)

## License

Copyright &copy; 2024 Broadcom. The term "Broadcom" refers to Broadcom Inc. and/or its subsidiaries.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.