# docker build -t myimage .
# docker run --env-file backend/server/.env -p 3000:3000 -p 4000:4000 myimage

FROM node:20

# Security: Drop all capabilities
USER root
RUN apt-get update && apt-get install -y libcap2-bin
RUN setcap cap_net_bind_service=+ep /usr/local/bin/node

# Build backend
WORKDIR /backend
COPY backend/server/package*.json ./
RUN npm install
COPY backend/server/ .
RUN npm run build

# Build frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

# Set working directory to the root directory
WORKDIR /

# Security: Create non-root user and assign ownership
RUN useradd -m appuser
RUN mkdir -p /backend/projects && chown -R appuser:appuser /backend/projects
USER appuser

# Start both backend and frontend
ENV BACKEND_PORT=4000
ENV FRONTEND_PORT=3000

EXPOSE 5173
EXPOSE $BACKEND_PORT
EXPOSE $FRONTEND_PORT

CMD ["sh", "-c", "cd /backend && PORT=$BACKEND_PORT npm run start & cd /frontend && PORT=$FRONTEND_PORT npm run start"]