#!/bin/bash

# Feedback Loop MCP - Build Script (Electron Forge)
# This script helps build the Electron application for different platforms using Electron Forge

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    echo "Feedback Loop MCP - Build Script (Electron Forge)"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  package       Package the application (creates .app bundle)"
    echo "  make          Create distributable packages (zip, dmg, etc.)"
    echo "  start         Start the application in development mode"
    echo "  npm           Create NPM package"
    echo "  clean         Clean build artifacts"
    echo "  install       Install dependencies"
    echo "  help          Show this help message"
    echo ""
    echo "Options:"
    echo "  --skip-deps   Skip dependency installation"
    echo "  --clean       Clean before building"
    echo ""
    echo "Examples:"
    echo "  $0 package               # Package the application"
    echo "  $0 make                  # Create distributable packages"
    echo "  $0 make --clean          # Clean and create distributables"
    echo "  $0 start                 # Start in development mode"
    echo ""
    echo "Output locations:"
    echo "  Packaged app: out/Feedback Loop MCP-darwin-arm64/"
    echo "  Distributables: out/make/zip/darwin/arm64/"
    echo ""
}

# Function to install dependencies
install_deps() {
    if [ "$SKIP_DEPS" = true ]; then
        print_warning "Skipping dependency installation"
        return
    fi
    
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Function to clean build artifacts
clean_build() {
    print_status "Cleaning build artifacts..."
    rm -rf out/
    rm -rf npm-package/
    print_success "Build artifacts cleaned"
}

# Function to package the application
package_app() {
    print_status "Packaging application..."
    npm run package
    print_success "Application packaged successfully"
    print_status "Packaged app available at: out/Feedback Loop MCP-darwin-arm64/"
}

# Function to create distributables
make_distributables() {
    print_status "Creating distributable packages..."
    npm run make
    print_success "Distributables created successfully"
    print_status "Distributables available at: out/make/"
}

# Function to start in development mode
start_dev() {
    print_status "Starting application in development mode..."
    npm run start
}

# Function to create NPM package
create_npm_package() {
    print_status "Creating NPM package using build script..."
    
    # Ensure scripts directory exists
    if [ ! -f "scripts/build-npm.js" ]; then
        print_error "Build script not found: scripts/build-npm.js"
        exit 1
    fi
    
    # Run the build script
    node scripts/build-npm.js
    
    if [ $? -eq 0 ]; then
        print_success "NPM package created successfully"
    else
        print_error "Failed to create NPM package"
        exit 1
    fi
}

# Parse command line arguments
COMMAND=""
SKIP_DEPS=false
CLEAN_FIRST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        package|make|start|npm|clean|install|help)
            COMMAND="$1"
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --clean)
            CLEAN_FIRST=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show help if no command provided
if [ -z "$COMMAND" ]; then
    show_help
    exit 0
fi

# Main execution
print_status "Starting build process with Electron Forge..."

# Clean first if requested
if [ "$CLEAN_FIRST" = true ]; then
    clean_build
fi

# Execute the requested command
case $COMMAND in
    help)
        show_help
        ;;
    install)
        install_deps
        ;;
    clean)
        clean_build
        ;;
    package)
        install_deps
        package_app
        ;;
    make)
        install_deps
        make_distributables
        ;;
    start)
        install_deps
        start_dev
        ;;
    npm)
        install_deps
        create_npm_package
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

print_success "Build process completed!"