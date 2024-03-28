{{/*
Copyright VMware, Inc.
SPDX-License-Identifier: APACHE-2.0
*/}}

{{/* vim: set filetype=mustache: */}}

{{/* 
Return true if the detected platform is Openshift
Usage:
{{- include "common.compatibility.isOpenshift" . -}}
*/}}
{{- define "common.compatibility.isOpenshift" -}}
{{- if .Capabilities.APIVersions.Has "security.openshift.io/v1" -}}
{{- true -}}
{{- end -}}
{{- end -}}

{{/*
Render a compatible securityContext depending on the platform. By default it is maintained as it is. In other platforms like Openshift we remove default user/group values that do not work out of the box with the restricted-v1 SCC
Usage:
{{- include "common.compatibility.renderSecurityContext" (dict "secContext" .Values.containerSecurityContext "context" $) -}}
*/}}
{{- define "common.compatibility.renderSecurityContext" -}}
{{- $adaptedContext := .secContext -}}
{{- if .context.Values.global.compatibility -}}
  {{- if .context.Values.global.compatibility.openshift -}}
    {{- if or (eq .context.Values.global.compatibility.openshift.adaptSecurityContext "force") (and (eq .context.Values.global.compatibility.openshift.adaptSecurityContext "auto") (include "common.compatibility.isOpenshift" .context)) -}}
      {{/* Remove incompatible user/group values that do not work in Openshift out of the box */}}
      {{- $adaptedContext = omit $adaptedContext "fsGroup" "runAsUser" "runAsGroup" -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- omit $adaptedContext "enabled" | toYaml -}}
{{- end -}}
