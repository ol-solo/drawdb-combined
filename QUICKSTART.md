# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Create Environment File

Create a `.env` file in the `drawdb-combined` directory:

```bash
cd drawdb-combined
cat > .env << EOF
PORT=5000
GITLAB_BASE_URL=https://gitlab.com
GITLAB_TOKEN=your_gitlab_token_here
GITLAB_PROJECT_ID=12345678
GITLAB_REF=main
SHARES_PATH_PREFIX=shares/
MAIL_SERVICE=gmail
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
CLIENT_URLS=http://localhost:5000
EOF
```

### 2. Build and Run

```bash
docker-compose up --build
```

### 3. Access the Application

Open your browser and go to: **http://localhost:5000**

That's it! 🎉

## 📁 What's Inside?

```
drawdb-combined/
├── client/          # Frontend React app
├── server/          # Backend Express API
├── Dockerfile       # Builds everything
└── docker-compose.yml
```

## 🔧 Alternative: Docker Direct

```bash
docker build -t drawdb-combined .
docker run -p 5000:5000 --env-file .env drawdb-combined
```

## 📝 Notes

- All code is in one folder - easy to manage!
- Single container - simpler deployment
- Frontend and backend run together
- No CORS issues - same origin

