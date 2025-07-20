# 🥬 ShelfLife.AI - Smart Food Expiry Tracker

**~85% Complete MVP** - An AI-powered platform that passively tracks food expiry and helps users reduce waste by estimating expiry dates from digital receipts and periodic fridge photos.

[![Build Status](https://github.com/yourusername/shelflife-ai/workflows/CI/badge.svg)](https://github.com/yourusername/shelflife-ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚡ Quick Start

```bash
# Clone and setup
git clone <your-repo-url>
cd shelflife-ai
chmod +x setup.sh && ./setup.sh

# Start backend (terminal 1)
cd backend && source venv/bin/activate && python main.py

# Start mobile app (terminal 2)
cd mobile-app && npm start
```

🌐 API: `http://localhost:8000` | 📝 Docs: `http://localhost:8000/docs`

## 🚀 Features

- ✅ **Smart Receipt Parsing**: Extract purchased items from grocery receipts (photo, PDF, or email)
- ✅ **AI Expiry Prediction**: Predict estimated expiry dates using built-in shelf life database
- ✅ **Inventory Tracking**: Track your food inventory per user and show items nearing expiry
- 🚧 **Smart Notifications**: Get notified about soon-to-expire food
- ✅ **Local Marketplace**: Optional map-based marketplace for nearby items offered by users

## 🏗️ Architecture

```
shelflife-ai/
├── README.md                 # This file
├── mobile-app/              # React Native + Expo mobile app
│   ├── App.tsx
│   ├── src/
│   └── package.json
├── backend/                 # FastAPI Python backend
│   ├── main.py
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── ml-model/               # Machine Learning models
│   ├── train.py
│   ├── predict.py
│   ├── models/
│   └── data/
├── infra/                  # Infrastructure & Deployment
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── helm/
└── .github/
    └── workflows/          # CI/CD pipelines
```

## 🛠️ Tech Stack

### Frontend
- **React Native + Expo** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Screen navigation
- **Expo Camera** - Receipt photo capture

### Backend
- **Python FastAPI** - Modern, fast web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **Tesseract OCR** - Receipt text extraction
- **Pydantic** - Data validation

### AI/ML
- **scikit-learn** - Machine learning models
- **LightGBM** - Gradient boosting for expiry prediction
- **OpenCV** - Image preprocessing
- **NumPy & Pandas** - Data processing

### DevOps
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Helm** - K8s package manager
- **GitHub Actions** - CI/CD

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 14+
- Docker & Docker Compose
- Expo CLI: `npm install -g @expo/cli`

### 🏃‍♂️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shelflife-ai.git
   cd shelflife-ai
   ```

2. **Start the backend services**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

3. **Run the mobile app**
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```

### 🐳 Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📱 Mobile App Usage

1. **Add Receipt**: Take a photo or upload a receipt
2. **View Inventory**: See all tracked food items
3. **Get Notifications**: Receive alerts for expiring items
4. **Local Market**: Browse nearby shared food items

## 🔧 Development Scripts

The project includes several helper scripts for development:

- `./setup.sh` - Complete environment setup (run once)
- `./dev.sh` - Development commands:
  - `./dev.sh services` - Start Docker services (DB + Redis)
  - `./dev.sh backend` - Start FastAPI backend
  - `./dev.sh mobile` - Start React Native mobile app
  - `./dev.sh test` - Run backend tests
  - `./dev.sh full` - Start complete development environment
- `./docker.sh` - Docker management:
  - `./docker.sh start` - Start database services
  - `./docker.sh stop` - Stop all services
  - `./docker.sh logs` - View service logs
  - `./docker.sh db` - Access PostgreSQL database

## 🔧 API Endpoints

- `POST /api/receipts/upload` - Upload and parse receipt
- `GET /api/inventory/{user_id}` - Get user's food inventory
- `POST /api/items/predict-expiry` - Predict item expiry date
- `GET /api/marketplace/nearby` - Get nearby shared items

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/modifications
- `chore:` - Build process or auxiliary tool changes

## 📊 Project Status

**~85% Complete MVP** with the following progress:

✅ **Completed:**
- [x] Complete FastAPI backend with business logic
- [x] Database models and relationships  
- [x] Mobile app UI with navigation
- [x] API client integration layer
- [x] Authentication system with JWT
- [x] ML model for expiry prediction
- [x] Receipt parsing with OCR
- [x] Docker containerization & CI/CD

🚧 **In Progress:**
- [ ] Screen API integration (HomeScreen ✅ done)
- [ ] Login/Register screens
- [ ] Background task processing
- [ ] Push notifications

🎯 **Ready for Production Soon!**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♀️ Support

For questions and support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for reducing food waste and building sustainable communities.
