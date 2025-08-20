# ---- Runtime image ----
FROM node:20-alpine


# Create app dir
WORKDIR /app


# Install dependencies separately for better caching
COPY package.json package-lock.json* ./
RUN npm ci || npm i --only=production


# Copy source
COPY src ./src


# Expose port
EXPOSE 3000


# Environment (optional)
# ENV PORT=3000
# ENV ALLOWED_ORIGINS=*


CMD ["npm", "start"]