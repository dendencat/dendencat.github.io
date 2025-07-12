# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jekyll-based GitHub Pages blog repository with a bilingual (Japanese/English) setup. The site serves as both a portfolio and technical blog, hosted at www.iohub.link.

## Development Commands

### Setup and Installation
```bash
cd docs/
bundle install
```

### Local Development
```bash
cd docs/
bundle exec jekyll serve
```
This starts a local development server at http://localhost:4000

### Update Dependencies
```bash
cd docs/
bundle update
```

### Update GitHub Pages Dependencies
```bash
cd docs/
bundle update github-pages
```

## Repository Architecture

### Dual Configuration Setup
- **Root directory**: Contains minimal Jekyll configuration with `jekyll-theme-minimal`
- **docs/ directory**: Main blog content with Minima theme and full Jekyll configuration

### Key Directories and Files
- `docs/_posts/`: Blog posts following Jekyll naming convention `YYYY-MM-DD-title.markdown`
- `docs/_config.yml`: Main Jekyll configuration for the blog
- `docs/Gemfile`: Ruby dependencies including `github-pages` gem
- `docs/CNAME`: Custom domain configuration (www.iohub.link)
- `_config.yml` (root): Minimal theme configuration for repository homepage

### Content Structure
- **Bilingual content**: Posts and pages support both Japanese and English
- **Blog posts**: Located in `docs/_posts/` with Jekyll front matter
- **GitHub Pages deployment**: Configured to build from docs/ directory

## Content Management

### Creating New Blog Posts
1. Navigate to `docs/_posts/`
2. Create file with naming convention: `YYYY-MM-DD-title.markdown`
3. Include required front matter:
```yaml
---
layout: post
title: "Your Post Title"
---
```

### Front Matter Requirements
All posts must include:
- `layout: post`
- `title: "Post Title"`

### Markdown Support
- Uses kramdown parser with GitHub Flavored Markdown support
- Supports standard Jekyll Liquid templating

## Technical Configuration

### Jekyll Plugins
- `jekyll-feed`: Automatically generates RSS feed
- GitHub Pages compatible gems via `github-pages` gem

### Theme Configuration
- **Main blog**: Minima theme (~> 2.0)
- **Repository page**: Jekyll minimal theme

### Deployment
- Automatic deployment via GitHub Pages
- Builds from docs/ directory
- Custom domain: www.iohub.link

## Working Directory
When developing blog content, work primarily in the `docs/` directory where the main Jekyll configuration and content are located.