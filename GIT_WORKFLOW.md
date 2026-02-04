# Git Workflow Guide

## 🚨 **BEFORE STARTING ANY WORK** 🚨

### 1. Check Current Status
```bash
git status                    # Check current branch and changes
git branch -vv               # See all branches and their tracking
git log --oneline -5         # See recent commits
```

### 2. Sync with Latest Changes
```bash
# If working on dev branch:
git checkout dev
git pull origin dev

# If working on feature branch:
git checkout feat/your-feature
git pull origin feat/your-feature  # Get latest feature changes
git merge dev                      # Merge latest dev changes
```

## 📋 **Daily Workflow**

### Starting Work
```bash
# 1. Always start by syncing
git checkout dev
git pull origin dev

# 2. Switch to your feature branch
git checkout feat/your-feature

# 3. Merge latest dev into your feature
git merge dev

# 4. Now you can start working
```

### During Work
```bash
# Make your changes, then:
git add .
git commit -m "descriptive commit message"
```

### End of Day
```bash
# Push your changes
git push origin feat/your-feature

# Optional: Merge feature into dev if ready
git checkout dev
git merge feat/your-feature
git push origin dev
```

## 🔄 **Branch Synchronization Rules**

### When to Sync:
- **Before starting work** (every day)
- **Before merging** feature into dev
- **When you see conflicts** or missing features
- **Weekly** as a routine

### How to Sync:
```bash
# Method 1: Merge (recommended)
git checkout your-feature
git merge dev

# Method 2: Rebase (advanced)
git checkout your-feature
git rebase dev
```

## 🚨 **Red Flags - When Something is Wrong**

If you see any of these, STOP and sync:
- Missing pages/features that should exist
- `git status` shows "ahead" or "behind" by many commits
- Errors about missing files or components
- Other team members mention missing features

## 🛠 **Emergency Fix (When Branches Get Out of Sync)**

```bash
# 1. Check what's missing
git diff --name-only dev feat/your-feature

# 2. Merge missing changes
git checkout feat/your-feature
git merge dev

# 3. If there are conflicts, resolve them and commit
git add .
git commit -m "resolve merge conflicts"

# 4. Push updated feature branch
git push origin feat/your-feature
```

## 📝 **Best Practices**

1. **Never work directly on dev** - always use feature branches
2. **Sync daily** - don't let branches drift apart
3. **Communicate** - tell team when you merge major features
4. **Test after syncing** - make sure everything still works
5. **Use descriptive commit messages** - help others understand changes

## 🔍 **Quick Diagnostics**

```bash
# Check if branches are in sync
git diff --name-only dev feat/your-feature

# See commit differences
git log --oneline dev ^feat/your-feature

# Check tracking status
git branch -vv
```

---
**Remember**: `git pull` only updates from the remote branch you're tracking. It doesn't sync between different local branches!
