#!/bin/bash

# Script de commit automatisé pour PWA 
# Usage: ./commit_dans_github.sh [-test]

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Mode test
TEST_MODE=false
if [[ "$1" == "-test" ]]; then
    TEST_MODE=true
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}        MODE TEST ACTIVÉ${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
fi

# Fonction pour afficher les actions
log_action() {
    if [ "$TEST_MODE" = true ]; then
        echo -e "${CYAN}[TEST]${NC} $1"
    else
        echo -e "${GREEN}[INFO]${NC} $1"
    fi
}

# Fonction pour exécuter une commande ou la simuler
execute_or_simulate() {
    if [ "$TEST_MODE" = true ]; then
        echo -e "${CYAN}[SIMULATION]${NC} $1"
    else
        eval "$1"
    fi
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Script de Commit PWA TDAH ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Afficher la branche actuelle
CURRENT_BRANCH=$(git branch --show-current)
log_action "Branche actuelle : ${YELLOW}${CURRENT_BRANCH}${NC}"
echo ""

# 2. Récupérer la dernière version depuis package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_action "Version actuelle dans package.json : ${YELLOW}${CURRENT_VERSION}${NC}"

# 3. Récupérer le dernier tag Git (si disponible)
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$LAST_TAG" ]; then
    log_action "Dernier tag Git : ${YELLOW}${LAST_TAG}${NC}"
fi
echo ""

# 4. Demander la nouvelle version
echo -e "${GREEN}Entrez le nouveau numéro de version (format: X.X.X.X) :${NC}"
read -p "> " NEW_VERSION

# Validation du format de version
if [[ ! $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Erreur : Format de version invalide. Utilisez le format X.X.X.X (ex: 0.6.1.13)${NC}"
    exit 1
fi

log_action "Nouvelle version : ${YELLOW}${NEW_VERSION}${NC}"
echo ""

# 5. Demander le message de commit
echo -e "${GREEN}Entrez le message de commit :${NC}"
read -p "> " COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="PWA-TDAH-${NEW_VERSION} - Mise à jour de version"
else
    COMMIT_MESSAGE="PWA-TDAH-${NEW_VERSION} ${COMMIT_MESSAGE}"
fi

log_action "Message de commit : ${YELLOW}${COMMIT_MESSAGE}${NC}"
echo ""

# 6. Demander confirmation de la branche
echo -e "${GREEN}Voulez-vous rester sur la branche '${CURRENT_BRANCH}' ? (o/n) [o] :${NC}"
read -p "> " BRANCH_CONFIRM

if [[ "$BRANCH_CONFIRM" == "n" || "$BRANCH_CONFIRM" == "N" ]]; then
    echo -e "${GREEN}Sur quelle branche souhaitez-vous commiter ?${NC}"
    read -p "> " TARGET_BRANCH
    
    log_action "Changement de branche vers : ${YELLOW}${TARGET_BRANCH}${NC}"
    
    if [ "$TEST_MODE" = false ]; then
        git checkout "$TARGET_BRANCH" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}La branche n'existe pas. Voulez-vous la créer ? (o/n) :${NC}"
            read -p "> " CREATE_BRANCH
            if [[ "$CREATE_BRANCH" == "o" || "$CREATE_BRANCH" == "O" ]]; then
                git checkout -b "$TARGET_BRANCH"
            else
                echo -e "${RED}Annulation.${NC}"
                exit 1
            fi
        fi
    fi
    CURRENT_BRANCH="$TARGET_BRANCH"
else
    TARGET_BRANCH="$CURRENT_BRANCH"
fi

echo ""

# 7. Afficher le résumé des actions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RÉSUMÉ DES ACTIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Branche          : ${YELLOW}${TARGET_BRANCH}${NC}"
echo -e "  Version actuelle : ${YELLOW}${CURRENT_VERSION}${NC}"
echo -e "  Nouvelle version : ${GREEN}${NEW_VERSION}${NC}"
echo -e "  Message commit   : ${CYAN}${COMMIT_MESSAGE}${NC}"
echo -e "  Tag Git          : ${CYAN}PWA-TDAH-${NEW_VERSION}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$TEST_MODE" = false ]; then
    echo -e "${GREEN}Voulez-vous continuer ? (o/n) [o] :${NC}"
    read -p "> " CONFIRM
    
    if [[ "$CONFIRM" == "n" || "$CONFIRM" == "N" ]]; then
        echo -e "${RED}Annulation.${NC}"
        exit 0
    fi
fi

echo ""

# 8. Mettre à jour package.json
log_action "Mise à jour de la version dans package.json"
if [ "$TEST_MODE" = false ]; then
    # Utiliser node pour mettre à jour la version dans package.json
    node -e "
        const fs = require('fs');
        const pkg = require('./package.json');
        pkg.version = '${NEW_VERSION}';
        fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo -e "${GREEN}✓${NC} package.json mis à jour"
else
    echo -e "${CYAN}[SIMULATION]${NC} node -e \"const fs = require('fs'); const pkg = require('./package.json'); pkg.version = '${NEW_VERSION}'; fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');\""
fi

# 9. Git add
log_action "Ajout des fichiers modifiés"
execute_or_simulate "git add ."

# 10. Git commit
log_action "Création du commit"
execute_or_simulate "git commit -m \"${COMMIT_MESSAGE}\""

# 11. Création du tag
TAG_NAME="PWA-TDAH-${NEW_VERSION}"
log_action "Création du tag : ${TAG_NAME}"
execute_or_simulate "git tag \"${TAG_NAME}\""

# 12. Git push avec -u pour la première fois
log_action "Push vers origin/${TARGET_BRANCH}"
execute_or_simulate "git push -u origin ${TARGET_BRANCH}"

# 13. Push du tag
log_action "Push du tag"
execute_or_simulate "git push origin \"${TAG_NAME}\""

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$TEST_MODE" = true ]; then
    echo -e "${YELLOW}  SIMULATION TERMINÉE${NC}"
    echo -e "${YELLOW}  Aucune action n'a été exécutée${NC}"
else
    echo -e "${GREEN}  ✓ COMMIT RÉUSSI${NC}"
    echo -e "${GREEN}  Version ${NEW_VERSION} déployée sur ${TARGET_BRANCH}${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$TEST_MODE" = false ]; then
    # Afficher les derniers commits
    echo -e "${CYAN}Derniers commits :${NC}"
    git log --oneline -3
    echo ""
    
    # Afficher les tags récents
    echo -e "${CYAN}Tags récents :${NC}"
    git tag -l "PWA-TDAH-*" | tail -5
fi
