# Clara on any container host (Render, Fly.io, Railway, a campus server).
# Needed for whole-class audio jobs: a long-running Node process, large uploads, ffmpeg.
FROM node:22-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Installs the Linux ffmpeg binary through ffmpeg-static. Dev dependencies are kept because
# `next build` needs TypeScript.
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
# Keys come from the host's environment settings, never from the image:
# GROQ_API_KEY, ANTHROPIC_API_KEY, optional CLARA_ACCESS_CODE
# The host may assign its own port (Railway sets PORT); 3000 is the local default.
CMD ["sh", "-c", "exec npx next start -p ${PORT:-3000}"]
