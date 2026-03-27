#!/usr/bin/env python3
"""
APK Rebuild Script for Capacitor Apps
Automatically syncs web assets and builds a fresh APK.
Works with any Capacitor project.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log(msg, color=Colors.RESET):
    # Force UTF-8 output on Windows
    try:
        print(f"{color}{msg}{Colors.RESET}")
    except UnicodeEncodeError:
        # Fallback: replace special chars with ASCII equivalents
        msg_ascii = msg.replace('→', '->').replace('✓', 'OK').replace('✗', 'X').replace('⚠', '!')
        print(f"{color}{msg_ascii}{Colors.RESET}")

def log_step(step, msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}[{step}]{Colors.RESET} {msg}")

def log_success(msg):
    log(f"✓ {msg}", Colors.GREEN)

def log_error(msg):
    log(f"✗ {msg}", Colors.RED)

def log_warning(msg):
    log(f"⚠ {msg}", Colors.YELLOW)

def run_cmd(cmd, cwd=None, timeout=600, env=None):
    """Run shell command and return success status"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def find_capacitor_config():
    """Find and load capacitor.config.json"""
    config_path = Path.cwd() / "capacitor.config.json"
    if not config_path.exists():
        log_error("capacitor.config.json not found in current directory")
        log_warning("Run this script from your Capacitor project root")
        sys.exit(1)

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config, config_path.parent
    except Exception as e:
        log_error(f"Failed to read capacitor.config.json: {e}")
        sys.exit(1)

def verify_web_dir(project_root, web_dir):
    """Verify web directory exists"""
    web_path = project_root / web_dir
    if not web_path.exists():
        log_error(f"Web directory '{web_dir}' not found at {web_path}")
        sys.exit(1)
    return web_path

def sync_web_assets(project_root, web_dir):
    """Copy latest web files to www/"""
    log_step("1/4", "Syncing web assets")

    web_path = verify_web_dir(project_root, web_dir)

    # Common web files to copy (src_name -> dst_name)
    web_files = [
        ('index.html', 'index.html'),
        ('styles.css', 'styles.css'),
        ('data.js', 'data.js'),
        ('app.js', 'app.js'),
    ]
    copied = []
    seen_dst = set()

    for src_name, dst_name in web_files:
        src = project_root / src_name
        if src.exists() and dst_name not in seen_dst:
            dst = web_path / dst_name
            shutil.copy2(src, dst)
            seen_dst.add(dst_name)
            label = src_name if src_name == dst_name else f"{src_name} → {dst_name}"
            copied.append(label)
            log(f"  → {label}", Colors.GREEN)

    if not copied:
        log_warning(f"No web files found in project root to copy to {web_dir}/")
        log_warning("Make sure your web assets are in the correct location")
    else:
        log_success(f"Copied {len(copied)} file(s) to {web_dir}/")

def capacitor_sync(project_root):
    """Run npx cap sync android"""
    log_step("2/4", "Running Capacitor sync")

    success, stdout, stderr = run_cmd("npx cap sync android", cwd=project_root, timeout=120)

    if success:
        log_success("Capacitor sync completed")
        # Show relevant output
        for line in stdout.split('\n'):
            if '√' in line or 'Sync' in line:
                log(f"  {line}", Colors.GREEN)
    else:
        log_error("Capacitor sync failed")
        print(stderr)
        sys.exit(1)

def setup_android_env():
    """Setup Android environment variables"""
    android_studio_jbr = Path("C:/Program Files/Android/Android Studio/jbr")
    android_sdk = Path.home() / "AppData/Local/Android/Sdk"

    env = os.environ.copy()

    if android_studio_jbr.exists():
        env['JAVA_HOME'] = str(android_studio_jbr)
    else:
        log_warning("Android Studio JBR not found, using system Java")

    if android_sdk.exists():
        env['ANDROID_HOME'] = str(android_sdk)
    else:
        log_warning("Android SDK not found at default location")

    return env

def build_apk(project_root, app_name):
    """Build the Android APK"""
    log_step("3/4", "Building APK")

    android_dir = project_root / "android"
    if not android_dir.exists():
        log_error("android/ directory not found")
        log_warning("Run 'npx cap add android' first")
        sys.exit(1)

    gradle_wrapper = android_dir / "gradlew.bat"
    if not gradle_wrapper.exists():
        log_error("gradlew.bat not found in android/")
        sys.exit(1)

    env = setup_android_env()

    log("  Building... (this may take a few minutes)")
    success, stdout, stderr = run_cmd(
        f'"{gradle_wrapper}" assembleDebug',
        cwd=android_dir,
        timeout=600,
        env=env
    )

    if success and "BUILD SUCCESSFUL" in stdout:
        # Extract build time
        for line in stdout.split('\n'):
            if 'BUILD SUCCESSFUL' in line:
                log_success(line.strip())
                break
    else:
        log_error("APK build failed")
        # Show last 30 lines of output
        lines = (stdout + stderr).split('\n')
        print('\n'.join(lines[-30:]))
        sys.exit(1)

def locate_and_copy_apk(project_root, app_name):
    """Find the built APK and copy it to project root"""
    log_step("4/4", "Locating APK")

    apk_path = project_root / "android/app/build/outputs/apk/debug/app-debug.apk"

    if not apk_path.exists():
        log_error("APK not found at expected location")
        sys.exit(1)

    # Copy to project root with app name
    output_name = f"{app_name}.apk"
    output_path = project_root / output_name

    shutil.copy2(apk_path, output_path)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    log_success(f"APK built successfully: {output_name} ({size_mb:.1f} MB)")
    log(f"\n  Location: {output_path}", Colors.BOLD)

    return output_path

def main():
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.HEADER}   APK Rebuild Script for Capacitor Apps{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.RESET}\n")

    # Load Capacitor config
    config, project_root = find_capacitor_config()

    app_name = config.get('appName', 'App')
    web_dir = config.get('webDir', 'www')
    app_id = config.get('appId', 'unknown')

    log(f"Project: {app_name}", Colors.BOLD)
    log(f"App ID:  {app_id}")
    log(f"Web Dir: {web_dir}")
    log(f"Root:    {project_root}\n")

    # Execute build pipeline
    try:
        sync_web_assets(project_root, web_dir)
        capacitor_sync(project_root)
        build_apk(project_root, app_name)
        apk_path = locate_and_copy_apk(project_root, app_name)

        # Success summary
        try:
            print(f"\n{Colors.BOLD}{Colors.GREEN}{'='*60}{Colors.RESET}")
            print(f"{Colors.BOLD}{Colors.GREEN}  ✓ Build Complete!{Colors.RESET}")
            print(f"{Colors.BOLD}{Colors.GREEN}{'='*60}{Colors.RESET}\n")
        except UnicodeEncodeError:
            print(f"\n{Colors.BOLD}{Colors.GREEN}{'='*60}{Colors.RESET}")
            print(f"{Colors.BOLD}{Colors.GREEN}  Build Complete!{Colors.RESET}")
            print(f"{Colors.BOLD}{Colors.GREEN}{'='*60}{Colors.RESET}\n")

        log("Next steps:", Colors.BOLD)
        log("  1. Transfer the APK to your phone")
        log("  2. Install it (enable 'Unknown sources' if needed)")
        log("  3. Connect to the same WiFi as your development server")

        if 'server' in config and 'url' in config['server']:
            server_url = config['server']['url']
            log(f"\n  Server URL: {server_url}", Colors.YELLOW)

    except KeyboardInterrupt:
        log_error("\n\nBuild cancelled by user")
        sys.exit(1)
    except Exception as e:
        log_error(f"\n\nUnexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
