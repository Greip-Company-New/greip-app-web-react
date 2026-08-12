#!/bin/bash
# =============================================================================
# Build + Deploy del frontend GREIP COMPANY a S3 + CloudFront
#
# Uso:
#   bash scripts/deploy.sh [profile] [bucket] [distribution-id]
#
#   Sin argumentos: lee los outputs del stack CloudFormation via AWS CLI.
#   Con argumentos: bash scripts/deploy.sh devGreipCompany web-greip-dev EXXXXXXXXXXXXX
# =============================================================================
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-1}
ENVIRONMENT=${ENVIRONMENT:-DEV}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stack_name() {
  if [ "${ENVIRONMENT}" = "DEV" ]; then
    echo "greip-frontend"
  else
    echo "greip-frontend-${ENVIRONMENT}"
  fi
}

# ── Resolver bucket y distribution ID ───────────────────────────
BUCKET="${3:-}"
DIST_ID="${4:-}"

if [ -z "${BUCKET}" ] || [ -z "${DIST_ID}" ]; then
  STACK="$(stack_name)"
  echo "[deploy] Leyendo outputs del stack ${STACK} ..."
  OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "${STACK}" \
    --region ${REGION} \
    --profile ${PROFILE} \
    --query "Stacks[0].Outputs" \
    --output json 2>/dev/null || echo "[]")

  if [ -z "${BUCKET}" ]; then
    BUCKET=$(echo "${OUTPUTS}" | python3 -c "import sys,json; outs=json.load(sys.stdin); print(next(o['OutputValue'] for o in outs if o['OutputKey']=='BucketName'))" 2>/dev/null || echo "")
  fi
  if [ -z "${DIST_ID}" ]; then
    DIST_ID=$(echo "${OUTPUTS}" | python3 -c "import sys,json; outs=json.load(sys.stdin); print(next(o['OutputValue'] for o in outs if o['OutputKey']=='CloudFrontDistributionId'))" 2>/dev/null || echo "")
  fi
fi

if [ -z "${BUCKET}" ]; then
  echo "[deploy] ERROR: No se pudo determinar el bucket. Pasa bucket y distribution-id como argumentos." >&2
  echo "  bash scripts/deploy.sh devGreipCompany web-greip-dev EXXXXXXXXXXXXX" >&2
  exit 1
fi

echo "[deploy] Bucket:       ${BUCKET}"
echo "[deploy] Distribution:  ${DIST_ID:-sin invalidacion}"
echo ""

# ── 1. Build ────────────────────────────────────────────────────
echo "[deploy] Build del frontend (Vite) ..."
cd "${DIR}"

# Asegurar que las dependencias esten instaladas
if [ ! -d "node_modules" ]; then
  npm ci
fi

npm run build

if [ ! -d "dist" ]; then
  echo "[deploy] ERROR: No se genero el directorio dist/" >&2
  exit 1
fi

# ── 2. Sync a S3 ─────────────────────────────────────────────────
echo ""
echo "[deploy] Subiendo archivos a s3://${BUCKET} ..."

# index.html con cache corto (no cachear para que CloudFront siempre pida el ultimo)
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --profile ${PROFILE} \
  --region ${REGION} \
  --cache-control "max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "favicon.*" \
  --exclude "*.svg"

# index.html y assets raiz sin cache o con cache corto
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --profile ${PROFILE} --region ${REGION} \
  --cache-control "max-age=60,must-revalidate" \
  --content-type "text/html; charset=utf-8"

# favicon y otros iconos con cache largo
if compgen -G "dist/favicon.*" > /dev/null 2>&1; then
  for f in dist/favicon.*; do
    aws s3 cp "${f}" "s3://${BUCKET}/$(basename "${f}")" \
      --profile ${PROFILE} --region ${REGION} \
      --cache-control "max-age=31536000,immutable"
  done
fi

if compgen -G "dist/*.svg" > /dev/null 2>&1; then
  for f in dist/*.svg; do
    aws s3 cp "${f}" "s3://${BUCKET}/$(basename "${f}")" \
      --profile ${PROFILE} --region ${REGION} \
      --cache-control "max-age=31536000,immutable"
  done
fi

echo "[deploy] Archivos subidos."

# ── 3. Invalidar CloudFront ──────────────────────────────────────
if [ -n "${DIST_ID}" ] && [ "${DIST_ID}" != "null" ]; then
  echo ""
  echo "[deploy] Invalidando cache de CloudFront ${DIST_ID} ..."
  INVALIDATION=$(aws cloudfront create-invalidation \
    --distribution-id "${DIST_ID}" \
    --paths "/*" \
    --profile ${PROFILE} \
    --query "Invalidation.Id" \
    --output text 2>/dev/null || echo "")

  if [ -n "${INVALIDATION}" ]; then
    echo "[deploy] Invalidacion creada: ${INVALIDATION}"
  else
    echo "[deploy] ATENCION: No se pudo crear la invalidacion. Verifica los permisos IAM."
  fi
fi

# ── 4. Resumen ───────────────────────────────────────────────────
CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$(stack_name)" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
  --output text 2>/dev/null || echo "")

echo ""
echo "=============================================="
echo "  Frontend desplegado"
echo "=============================================="
echo "  S3:         s3://${BUCKET}"
echo "  CloudFront: ${CF_DOMAIN}"

WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name "$(stack_name)" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "${WEBSITE_URL}" ] && [ "${WEBSITE_URL}" != "None" ]; then
  echo "  URL:        ${WEBSITE_URL}"
fi

echo "=============================================="
