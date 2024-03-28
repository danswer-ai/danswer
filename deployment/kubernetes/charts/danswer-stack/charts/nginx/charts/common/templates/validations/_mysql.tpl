{{/*
Copyright VMware, Inc.
SPDX-License-Identifier: APACHE-2.0
*/}}

{{/* vim: set filetype=mustache: */}}
{{/*
Validate MySQL required passwords are not empty.

Usage:
{{ include "common.validations.values.mysql.passwords" (dict "secret" "secretName" "subchart" false "context" $) }}
Params:
  - secret - String - Required. Name of the secret where MySQL values are stored, e.g: "mysql-passwords-secret"
  - subchart - Boolean - Optional. Whether MySQL is used as subchart or not. Default: false
*/}}
{{- define "common.validations.values.mysql.passwords" -}}
  {{- $existingSecret := include "common.mysql.values.auth.existingSecret" . -}}
  {{- $enabled := include "common.mysql.values.enabled" . -}}
  {{- $architecture := include "common.mysql.values.architecture" . -}}
  {{- $authPrefix := include "common.mysql.values.key.auth" . -}}
  {{- $valueKeyRootPassword := printf "%s.rootPassword" $authPrefix -}}
  {{- $valueKeyUsername := printf "%s.username" $authPrefix -}}
  {{- $valueKeyPassword := printf "%s.password" $authPrefix -}}
  {{- $valueKeyReplicationPassword := printf "%s.replicationPassword" $authPrefix -}}

  {{- if and (or (not $existingSecret) (eq $existingSecret "\"\"")) (eq $enabled "true") -}}
    {{- $requiredPasswords := list -}}

    {{- $requiredRootPassword := dict "valueKey" $valueKeyRootPassword "secret" .secret "field" "mysql-root-password" -}}
    {{- $requiredPasswords = append $requiredPasswords $requiredRootPassword -}}

    {{- $valueUsername := include "common.utils.getValueFromKey" (dict "key" $valueKeyUsername "context" .context) }}
    {{- if not (empty $valueUsername) -}}
        {{- $requiredPassword := dict "valueKey" $valueKeyPassword "secret" .secret "field" "mysql-password" -}}
        {{- $requiredPasswords = append $requiredPasswords $requiredPassword -}}
    {{- end -}}

    {{- if (eq $architecture "replication") -}}
        {{- $requiredReplicationPassword := dict "valueKey" $valueKeyReplicationPassword "secret" .secret "field" "mysql-replication-password" -}}
        {{- $requiredPasswords = append $requiredPasswords $requiredReplicationPassword -}}
    {{- end -}}

    {{- include "common.validations.values.multiple.empty" (dict "required" $requiredPasswords "context" .context) -}}

  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right value for existingSecret.

Usage:
{{ include "common.mysql.values.auth.existingSecret" (dict "context" $) }}
Params:
  - subchart - Boolean - Optional. Whether MySQL is used as subchart or not. Default: false
*/}}
{{- define "common.mysql.values.auth.existingSecret" -}}
  {{- if .subchart -}}
    {{- .context.Values.mysql.auth.existingSecret | quote -}}
  {{- else -}}
    {{- .context.Values.auth.existingSecret | quote -}}
  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right value for enabled mysql.

Usage:
{{ include "common.mysql.values.enabled" (dict "context" $) }}
*/}}
{{- define "common.mysql.values.enabled" -}}
  {{- if .subchart -}}
    {{- printf "%v" .context.Values.mysql.enabled -}}
  {{- else -}}
    {{- printf "%v" (not .context.Values.enabled) -}}
  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right value for architecture

Usage:
{{ include "common.mysql.values.architecture" (dict "subchart" "true" "context" $) }}
Params:
  - subchart - Boolean - Optional. Whether MySQL is used as subchart or not. Default: false
*/}}
{{- define "common.mysql.values.architecture" -}}
  {{- if .subchart -}}
    {{- .context.Values.mysql.architecture -}}
  {{- else -}}
    {{- .context.Values.architecture -}}
  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right value for the key auth

Usage:
{{ include "common.mysql.values.key.auth" (dict "subchart" "true" "context" $) }}
Params:
  - subchart - Boolean - Optional. Whether MySQL is used as subchart or not. Default: false
*/}}
{{- define "common.mysql.values.key.auth" -}}
  {{- if .subchart -}}
    mysql.auth
  {{- else -}}
    auth
  {{- end -}}
{{- end -}}
