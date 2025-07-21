# 🚀 ShelfLife.AI - Setup Guide for New Features

## 📦 What's New

We've added several exciting features to ShelfLife.AI:

### ✅ Implemented Features:
- 🔐 **Google OAuth Login** - Sign in with your Google account
- ✋ **Manual Item Addition** - Add items manually with AI expiry prediction
- 💳 **Buy Now Functionality** - Purchase marketplace items with Stripe
- 📱 **Enhanced Login/Register Screens** - Improved authentication UI
- 🛒 **Enhanced Marketplace** - Better shopping experience with payments

## 🛠️ Setup Instructions

### 1. Backend Setup

#### Install New Dependencies
The backend already includes the necessary dependencies. If you need to reinstall:

```bash
cd backend
pip install -r requirements.txt
```

#### Environment Variables
Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to APIs & Services → Library
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → OAuth 2.0 Client IDs
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/api/oauth/google/callback`
5. **Update your `.env` file**:
   ```
   GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### 3. Stripe Payment Setup

1. **Create Stripe Account**: https://dashboard.stripe.com/register
2. **Get your API keys**:
   - Go to Developers → API Keys
   - Copy your Publishable and Secret keys
3. **Update your `.env` file**:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key
   STRIPE_SECRET_KEY=sk_test_your-secret-key
   ```

### 4. Mobile App Setup

#### Install New Dependencies
```bash
cd mobile-app
npm install
```

New dependencies added:
- `@react-native-async-storage/async-storage` - For local storage
- `@react-native-community/datetimepicker` - Date picker for manual item addition
- `@stripe/stripe-react-native` - Stripe payments
- `expo-auth-session` - OAuth authentication
- `expo-web-browser` - For OAuth flow

## 🎯 How to Use New Features

### Google Login
1. Click "Continue with Google" on login screen
2. Complete OAuth flow in browser
3. You'll be automatically logged in

### Manual Item Addition
1. From home screen, tap "Add Manually"
2. Fill in item details (name, category, quantity)
3. AI will predict expiry date automatically
4. Save to add to your inventory

### Buy Items from Marketplace
1. Browse marketplace items
2. Tap "Buy Now" on any item
3. Enter payment details (test card: 4242 4242 4242 4242)
4. Complete purchase
5. View orders in marketplace

## 🧪 Testing

### Test Accounts
- **Demo Account**: `demo@shelflife.ai` / `demo123`
- **Stripe Test Cards**: Use `4242 4242 4242 4242` with any future expiry

### API Testing
The backend now includes these new endpoints:
- `POST /api/oauth/google/mobile` - Google OAuth login
- `POST /api/payments/create-payment-intent` - Create payment
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/payments/orders` - Get user orders
- `POST /api/inventory/` - Add manual inventory items

## 📋 Development Commands

```bash
# Start backend with new features
cd backend && python main.py

# Start mobile app with new features
cd mobile-app && npm start

# Run backend tests
cd backend && python -m pytest tests/ -v
```

## 🚀 Production Deployment

### Environment Variables for Production
Make sure to update these in your production environment:

```bash
# Security
DEBUG=false
SECRET_KEY=your-production-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/oauth/google/callback

# Stripe (use live keys)
STRIPE_PUBLISHABLE_KEY=pk_live_your-live-publishable-key
STRIPE_SECRET_KEY=sk_live_your-live-secret-key

# Database
DATABASE_URL=your-production-database-url
```

## 🎉 What's Next?

These new features bring ShelfLife.AI much closer to the complete vision outlined in the technical specification:

### ✅ Completed MVP Features:
- [x] Google OAuth authentication
- [x] Manual item addition with AI predictions
- [x] Marketplace with payment processing
- [x] Enhanced user interface
- [x] Login/registration system

### 🔄 Coming Soon:
- [ ] Push notifications for expiring items
- [ ] Recipe suggestions based on inventory
- [ ] Social sharing features
- [ ] Advanced analytics dashboard

## 💡 Tips

1. **Testing Payments**: Always use Stripe test mode in development
2. **Google OAuth**: Make sure your redirect URLs match exactly
3. **Mobile Testing**: Use Expo Go app for easy testing on physical devices
4. **Database**: The app will create necessary tables automatically

## 🆘 Troubleshooting

### Common Issues:

1. **Google OAuth not working**:
   - Check that redirect URI matches exactly
   - Ensure Google+ API is enabled

2. **Stripe payments failing**:
   - Verify you're using test keys in development
   - Check that webhook endpoints are configured

3. **App crashes on startup**:
   - Clear cache: `npx expo start --clear`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

Happy coding! 🚀
