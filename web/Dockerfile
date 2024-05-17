FROM node:20-alpine

LABEL com.danswer.maintainer="founders@danswer.ai"
LABEL com.danswer.description="This image is for the frontend/webserver of Danswer. It is MIT \
Licensed and free for all to use. You can find it at \
https://hub.docker.com/r/danswer/danswer-web-server. For more details, visit \
https://github.com/danswer-ai/danswer."

# Default DANSWER_VERSION, typically overridden during builds by GitHub Actions.
ARG DANSWER_VERSION=0.3-dev
ENV DANSWER_VERSION=${DANSWER_VERSION}

# Install system dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copy the source code
COPY . .

# Disable automatic telemetry collection
ENV NEXT_TELEMETRY_DISABLED 1

# Environment variables must be present at build time AND run time
# https://github.com/vercel/next.js/discussions/14030
ARG NEXT_PUBLIC_DISABLE_STREAMING
ENV NEXT_PUBLIC_DISABLE_STREAMING=${NEXT_PUBLIC_DISABLE_STREAMING}

ARG NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA
ENV NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA=${NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA}

# allow user to specify custom feedback options
ARG NEXT_PUBLIC_POSITIVE_PREDEFINED_FEEDBACK_OPTIONS
ENV NEXT_PUBLIC_POSITIVE_PREDEFINED_FEEDBACK_OPTIONS=${NEXT_PUBLIC_POSITIVE_PREDEFINED_FEEDBACK_OPTIONS}

ARG NEXT_PUBLIC_NEGATIVE_PREDEFINED_FEEDBACK_OPTIONS
ENV NEXT_PUBLIC_NEGATIVE_PREDEFINED_FEEDBACK_OPTIONS=${NEXT_PUBLIC_NEGATIVE_PREDEFINED_FEEDBACK_OPTIONS}

# Build the application
RUN npm run build

# Remove global node modules, since they are not needed by the actual app
# (all dependencies are copied over into the `/app` dir itself). These
# global modules may be outdated and trigger security scans.
RUN rm -rf /usr/local/lib/node_modules

# Set up runtime environment
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

CMD ["node", "server.js"]
