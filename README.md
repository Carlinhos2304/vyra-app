# 👔 Vyra

Vyra is a mobile wardrobe management application designed to help users organize their clothing, create outfits, and plan what to wear through an intuitive and personalized experience.

## 📱 Features

* User authentication with Supabase
* Personal wardrobe management
* Outfit creation and organization
* Outfit planning and scheduling
* Personalized onboarding experience
* User preferences and style customization
* Push notification reminders for planned outfits
* Modern and responsive mobile UI

## 🛠️ Tech Stack

### Frontend

* React Native
* Expo
* Expo Router
* TypeScript

### Backend

* Supabase

  * Authentication
  * PostgreSQL Database
  * Row Level Security (RLS)

### Additional Libraries

* Expo Notifications
* React Native Safe Area Context
* React Native Community DateTimePicker
* Expo Vector Icons

## 🎯 Problem It Solves

Many people struggle to keep track of their wardrobe, remember outfit combinations, or decide what to wear each day.

Vyra helps users:

* Organize their clothing digitally
* Plan outfits in advance
* Save favorite combinations
* Improve wardrobe visibility
* Reduce decision fatigue when choosing outfits

## 📂 Project Structure

```text
app/
├── (tabs)/
├── auth/
├── onboarding/
├── profile/
├── planner/
└── wardrobe/

components/
├── branding/
├── ui/
└── shared/

hooks/
lib/
services/
```

## 🚀 Getting Started

### Installation

```bash
git clone https://github.com/your-username/vyra-app.git
cd vyra-app

npm install
```

### Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run the Project

```bash
npx expo start
```

## 🔐 Authentication

Vyra uses Supabase Authentication with:

* Email & Password Login
* User Profile Management
* Onboarding State Tracking

## 📌 Current Status

Vyra is currently under active development.

Implemented:

* Authentication
* User profiles
* Onboarding flow
* Planner foundation
* Wardrobe management foundation

In Progress:

* AI outfit recommendations
* Advanced planner features
* Enhanced notifications
* Outfit analytics

## 👨‍💻 Author

Carlos Miguel Méndez Corona

* Full Stack Developer
* React Native Developer
* Data Analytics Enthusiast

## 📄 License

This project is licensed under the MIT License.
