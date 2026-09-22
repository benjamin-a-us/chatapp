#!/usr/bin/env bash
# Deploy Chat House - Interactive Setup Menu
# Usage: bash deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║     🚀 Chat House - Deployment Helper         ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "Choose your deployment option:"
echo ""
echo "1) ${GREEN}Quick Deploy${NC} - Automated setup on DigitalOcean (30 min)"
echo "2) ${YELLOW}Manual Deploy${NC} - Step-by-step instructions"
echo "3) ${BLUE}CI/CD Setup${NC} - Enable GitHub Actions auto-deploy"
echo "4) ${YELLOW}Optimize${NC} - Performance improvements & refactoring"
echo "5) ${BLUE}View Docs${NC} - Open documentation"
echo "6) ${RED}Exit${NC}"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "${GREEN}Opening QUICKSTART.md...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open QUICKSTART.md
        elif command -v open &> /dev/null; then
            open QUICKSTART.md
        else
            cat QUICKSTART.md
        fi
        ;;
    2)
        echo -e "${GREEN}Opening DEPLOYMENT.md...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open DEPLOYMENT.md
        elif command -v open &> /dev/null; then
            open DEPLOYMENT.md
        else
            cat DEPLOYMENT.md
        fi
        ;;
    3)
        echo -e "${GREEN}Opening CI_CD_SETUP.md...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open CI_CD_SETUP.md
        elif command -v open &> /dev/null; then
            open CI_CD_SETUP.md
        else
            cat CI_CD_SETUP.md
        fi
        ;;
    4)
        echo -e "${GREEN}Opening OPTIMIZATION.md...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open OPTIMIZATION.md
        elif command -v open &> /dev/null; then
            open OPTIMIZATION.md
        else
            cat OPTIMIZATION.md
        fi
        ;;
    5)
        echo -e "${GREEN}Opening DOCS.md...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open DOCS.md
        elif command -v open &> /dev/null; then
            open DOCS.md
        else
            cat DOCS.md
        fi
        ;;
    6)
        echo -e "${YELLOW}Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please try again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Done!${NC}"
