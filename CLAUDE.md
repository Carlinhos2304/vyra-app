# Instructions for Claude

You are the primary software engineer working on Vyra.

Before implementing any feature:

1. Read this document completely.
2. Understand the current architecture.
3. Preserve existing code style.
4. Never rewrite working features unless requested.
5. Reuse existing components whenever possible.
6. Maintain the premium UI design language.
7. Explain your reasoning before making major architectural changes.
8. If information is missing, ask questions instead of making assumptions.

# VYRA

Version: 1.0

---

# Project Overview

Vyra is a premium AI-powered virtual wardrobe mobile application.

The goal of the application is to help users organize their clothing, create outfits, plan events, and receive intelligent outfit recommendations powered by Artificial Intelligence.

The application is designed with a premium, elegant, minimal aesthetic inspired by Apple and modern fashion applications.

The project is currently built using:

- React Native
- Expo
- Expo Router
- TypeScript
- Supabase
- Claude AI (future AI features)

The project is intended to become a production-ready mobile application.

---

# Current Development Stage

Current version:

V1

Implemented features:

✅ Authentication

✅ User profiles

✅ Closet management

✅ Add garments

✅ Edit garments

✅ Favorite garments

✅ Outfit creation

✅ Outfit details

✅ Outfit planner

✅ Calendar planner

✅ Events

✅ Outfit assignment to events

✅ Collections

Current priority:

Integrate Artificial Intelligence into the wardrobe experience.

---

# Project Goals

Vyra should become an intelligent personal wardrobe assistant.

The application should eventually provide:

- Automatic clothing analysis
- Outfit generation
- Style recommendations
- Packing assistant
- AI stylist
- Virtual Try-On

However, development should happen incrementally.

Never implement future features unless explicitly requested.

---

# Tech Stack

Frontend

- React Native
- Expo
- Expo Router
- TypeScript

Backend

- Supabase

Database

- PostgreSQL (Supabase)

Authentication

- Supabase Auth

Storage

- Supabase Storage

Future AI

- Claude Vision
- Claude API

---

# Folder Structure

app/

Contains all application screens.

Structure:

tabs/

Main navigation.

home

closet

calendar

create

profile

auth/

login

register

clothing/

Garment pages.

add-garment

edit-garment

[id]

outfit/

Outfit details.

planner/

Calendar planning.

create-event

event-details

select-outfit

components/

Reusable components.

components/ui

Premium reusable UI system.

components/outfits

Outfit related components.

components/branding

Brand assets.

components/ai

Future AI components.

hooks/

Reusable hooks.

lib/

Supabase client.

services/

Business logic.

constants/

Theme

Typography

Motion

Radius

---

# Database

Main entities

profiles

Stores user profile.

Fields

id

username

avatar_url

gender

birth_date

created_at

-------------------------

clothing_items

Stores every garment.

Fields

id

user_id

name

category

color

image_url

season

brand

is_favorite

ai_description

tags

created_at

Future fields may include

material

pattern

style

confidence_score

-------------------------

outfits

Stores outfits.

Fields

id

user_id

name

occasion

created_at

-------------------------

outfit_items

Relationship table.

Many clothing items belong to one outfit.

Fields

id

outfit_id

clothing_item_id

-------------------------

events

Stores calendar events.

Fields

id

user_id

name

description

event_date

location

category

outfit_id

created_at

-------------------------

outfit_plans

Stores which outfit is assigned to a calendar day.

Fields

id

user_id

outfit_id

planned_date

created_at

-------------------------

collections

User collections.

Example

Summer

Winter

Work

Travel

Fields

id

user_id

name

-------------------------

collection_items

Many-to-many relationship.

collection_id

clothing_item_id

---

# UI Philosophy

Vyra follows a premium visual identity.

Design principles:

Minimal

Elegant

Luxury

Clean

Neutral

Professional

Inspired by:

Apple

COS

Uniqlo

Notion

Avoid:

Bright colors

Heavy gradients

Material Design appearance

Cluttered layouts

Unnecessary shadows

Rounded corners should be subtle.

Animations should be smooth.

Whitespace is important.

---

# Component Philosophy

Always reuse components whenever possible.

Prefer existing UI components over creating new ones.

Examples:

PremiumCard

PremiumTouchable

PremiumScreen

PremiumLoader

SectionHeader

SectionTitle

Avoid duplicate UI code.

---

# Code Philosophy

Always write:

Readable code.

Maintainable code.

Scalable code.

Avoid:

Duplicated logic.

Huge components.

Nested callbacks.

Unnecessary state.

Large files.

Prefer extracting reusable logic.

---

# Routing

The application uses Expo Router.

Never replace Expo Router.

Always follow existing routing conventions.

---

# State Management

Current state management uses:

React Hooks

Supabase

Local component state

Do not introduce Redux, Zustand, MobX or other libraries unless explicitly requested.

---

# Styling

Uses:

StyleSheet.create()

Do not migrate to Tailwind.

Do not migrate to NativeWind.

Keep the existing styling system.

---

# Supabase

Supabase is the source of truth.

Never replace Supabase.

Never change existing database field names unless explicitly requested.

Always respect existing schema.

---

# AI Roadmap

Future AI features should be implemented in phases.

Phase 1

Automatic garment analysis.

When a user uploads clothing:

Claude receives the image.

Claude returns JSON.

Example:

{
  "category":"Top",
  "subcategory":"T-Shirt",
  "primary_color":"Black",
  "secondary_color":"White",
  "season":"Summer",
  "occasion":"Casual",
  "material":"Cotton",
  "description":"Black oversized cotton t-shirt with minimal white print.",
  "tags":[
      "minimal",
      "oversized",
      "cotton"
  ]
}

The app automatically stores this information.

---

Phase 2

AI outfit generation.

Claude receives:

Entire wardrobe.

Current season.

Weather (future).

Occasion.

Returns:

Recommended outfit.

Reasoning.

Alternative outfits.

---

Phase 3

AI stylist.

Natural conversation.

Examples:

"I have a wedding tomorrow."

"I need something casual."

"I'm traveling to Japan."

---

Phase 4

Virtual Try-On.

This feature will NOT use Claude.

It will require dedicated VTON models.

Examples:

CatVTON

IDM-VTON

Kolors

OutfitAnyone

Do not suggest implementing this unless requested.

---

# Coding Rules for Claude

Always preserve existing architecture.

Never redesign the application.

Never rewrite working screens.

Never rename database columns.

Never create duplicate components.

Never introduce unnecessary dependencies.

Always respect the premium design language.

Always keep screens responsive.

Always prefer reusable code.

When implementing new features:

Understand the current architecture first.

Integrate with existing components.

Keep changes isolated.

Avoid breaking existing functionality.

---

# Current Priorities

Highest priority:

Artificial Intelligence.

Specifically:

1. Automatic garment tagging

2. Automatic clothing description

3. AI outfit generation

Future priorities:

Packing assistant

AI stylist

Shopping recommendations

Virtual Try-On

---

# Vision

Vyra should feel like having a personal stylist in your pocket.

Every feature should make the user's wardrobe smarter, easier to manage, and more enjoyable to use.

The long-term goal is to build one of the best AI-powered wardrobe applications available.