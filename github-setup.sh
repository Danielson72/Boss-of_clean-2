#!/bin/bash

# Replace 'yourusername' with your actual GitHub username
# Replace 'boss-of-clean' with your actual repository name

echo "🚀 Setting up Boss of Clean GitHub repository..."

# Add GitHub remote (replace with your actual GitHub URL)
git remote add origin https://github.com/yourusername/boss-of-clean.git

# Push to GitHub
git branch -M main
git push -u origin main

echo "✅ Boss of Clean pushed to GitHub successfully!"
echo "🎯 Next step: Connect to Netlify for deployment"