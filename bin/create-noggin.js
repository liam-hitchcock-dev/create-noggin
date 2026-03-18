#!/usr/bin/env node

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

// Parse CLI args
const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  const pkg = require(path.join(__dirname, "..", "package.json"));
  console.log(`create-noggin v${pkg.version}`);
  process.exit(0);
}

const YES = args.includes("--yes") || args.includes("-y");
const NO_SYMLINK = args.includes("--no-symlink");
const dirArg = args.find((a) => a.startsWith("--dir="));
const DIR_OVERRIDE = dirArg ? dirArg.split("=")[1].replace(/^~/, HOME) : null;

function ask(rl, question, defaultVal) {
  if (YES) {
    console.log(`${question} [${defaultVal}]: ${defaultVal}`);
    return Promise.resolve(defaultVal);
  }
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultVal}]: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function askYesNo(rl, question, defaultVal = true) {
  if (YES) {
    console.log(`${question} (${defaultVal ? "Y/n" : "y/N"}): ${defaultVal ? "y" : "n"}`);
    return Promise.resolve(defaultVal);
  }
  return new Promise((resolve) => {
    const hint = defaultVal ? "Y/n" : "y/N";
    rl.question(`${question} (${hint}): `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultVal);
      else resolve(a === "y" || a === "yes");
    });
  });
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts }).trim();
  } catch {
    return null;
  }
}

function hasCommand(cmd) {
  return run(`which ${cmd}`) !== null;
}

function symlinkSafe(source, target) {
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink()) {
    return "already linked";
  }
  if (fs.existsSync(target)) {
    const backup = `${target}.bak.${Date.now()}`;
    fs.renameSync(target, backup);
    fs.symlinkSync(source, target);
    return `backed up and linked`;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(source, target);
  return "linked";
}

function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
  } catch {}
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("");
  console.log("  noggin - portable Claude Code config");
  console.log("  =====================================");
  console.log("");

  // Step 1: Config directory
  const defaultDir = path.join(HOME, ".claude-config");
  const configDir = DIR_OVERRIDE || (await ask(rl, "Where should the config repo live?", defaultDir));
  const resolvedDir = configDir.replace(/^~/, HOME);

  // Check if already installed
  const nogginFile = path.join(resolvedDir, "noggin");
  if (fs.existsSync(nogginFile) && fs.existsSync(path.join(resolvedDir, ".git"))) {
    console.log(`  noggin is already set up at ${resolvedDir}`);
    console.log("");
    const doUpdate = await askYesNo(rl, "Update noggin scripts to latest version?");
    if (doUpdate) {
      rl.close();
      // Update plumbing files directly — same list as noggin update
      const updatable = [
        "noggin",
        "autopush.sh",
        "install.sh",
        "scripts/noggin-autopush.sh",
        "scripts/session-pull.sh",
        "scripts/session-log.sh",
      ];
      let updated = 0;
      for (const file of updatable) {
        const src = path.join(TEMPLATES_DIR, file);
        const dest = path.join(resolvedDir, file);
        if (!fs.existsSync(src)) continue;
        const srcContent = fs.readFileSync(src);
        const destContent = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
        if (destContent && srcContent.equals(destContent)) continue;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        makeExecutable(dest);
        const label = destContent ? "updated" : "new";
        console.log(`  ~ ${file} (${label})`);
        updated++;
      }
      if (updated === 0) {
        console.log("  Already up to date.");
      } else {
        console.log(`\n  Updated ${updated} file(s).`);
      }
      console.log("");
      console.log("  noggin status    check sync health");
      console.log("  noggin doctor    fix broken symlinks");
    } else {
      rl.close();
      console.log("");
      console.log("  noggin status    check sync health");
      console.log("  noggin doctor    fix broken symlinks");
      console.log("  noggin update    update scripts later");
    }
    process.exit(0);
  }

  // Step 2: GitHub remote
  const hasGh = hasCommand("gh");
  let createRemote = false;
  let repoName = "";
  if (hasGh) {
    createRemote = await askYesNo(rl, "Create a private GitHub repo for syncing?");
    if (createRemote) {
      repoName = await ask(rl, "Repo name?", "claude-noggin");
    }
  } else {
    console.log("  (gh CLI not found — skipping GitHub repo creation)");
  }

  // Step 3: Auto-sync (macOS only)
  const isMac = os.platform() === "darwin";
  let setupLaunchd = false;
  if (isMac) {
    setupLaunchd = await askYesNo(rl, "Set up auto-push every 10 minutes? (macOS launchd)");
  }

  // Step 4: noggin CLI
  const setupCli = await askYesNo(rl, "Install the noggin CLI to ~/bin?");

  rl.close();

  console.log("");
  console.log("Setting up...");
  console.log("");

  // Create config directory
  fs.mkdirSync(resolvedDir, { recursive: true });
  console.log(`  Created ${resolvedDir}`);

  // Copy template files
  const templateFiles = [
    "autopush.sh",
    "install.sh",
    "scripts/noggin-autopush.sh",
    "scripts/session-pull.sh",
    "scripts/session-log.sh",
    "skills/memory-health/SKILL.md",
    "noggin",
    "README.md",
  ];

  for (const file of templateFiles) {
    const src = path.join(TEMPLATES_DIR, file);
    const dest = path.join(resolvedDir, file);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`  Created ${file}`);
    } else {
      console.log(`  Skipped ${file} (exists)`);
    }
  }

  // Make scripts executable
  for (const file of ["autopush.sh", "install.sh", "noggin", "scripts/noggin-autopush.sh", "scripts/session-pull.sh", "scripts/session-log.sh"]) {
    makeExecutable(path.join(resolvedDir, file));
  }

  // Create settings.json with hooks (use ~ paths so they're portable)
  const settingsPath = path.join(resolvedDir, "settings.json");
  if (!fs.existsSync(settingsPath)) {
    const configRef = resolvedDir.replace(HOME, "~");
    const settings = {
      hooks: {
        PostToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [{ type: "command", command: `${configRef}/scripts/noggin-autopush.sh` }],
          },
        ],
        Stop: [
          {
            hooks: [{ type: "command", command: `${configRef}/scripts/session-log.sh` }],
          },
        ],
        SessionStart: [
          {
            hooks: [{ type: "command", command: `${configRef}/scripts/session-pull.sh` }],
          },
        ],
      },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    console.log("  Created settings.json with sync hooks");
  }

  // Create .gitignore
  const gitignorePath = path.join(resolvedDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, ".DS_Store\n");
    console.log("  Created .gitignore");
  }

  // Create scaffold directories
  for (const dir of ["skills", "scripts", "projects"]) {
    fs.mkdirSync(path.join(resolvedDir, dir), { recursive: true });
  }

  // Symlink into ~/.claude (skip if --no-symlink for testing)
  if (!NO_SYMLINK) {
    console.log("");
    console.log("Linking into ~/.claude...");
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });

    const symlinks = [
      { source: path.join(resolvedDir, "skills"), target: path.join(CLAUDE_DIR, "skills") },
      { source: path.join(resolvedDir, "scripts"), target: path.join(CLAUDE_DIR, "scripts") },
      { source: settingsPath, target: path.join(CLAUDE_DIR, "settings.json") },
    ];

    for (const { source, target } of symlinks) {
      const result = symlinkSafe(source, target);
      console.log(`  ${path.basename(target)}: ${result}`);
    }
  }

  // Init git repo
  console.log("");
  console.log("Initializing git...");
  if (!fs.existsSync(path.join(resolvedDir, ".git"))) {
    run("git init", { cwd: resolvedDir });
    run("git branch -m main", { cwd: resolvedDir });
    run("git add -A", { cwd: resolvedDir });
    run('git commit -m "feat: initial noggin setup"', { cwd: resolvedDir });
    console.log("  Initialized repo with initial commit");
  } else {
    console.log("  Git repo already exists");
  }

  // Create GitHub remote
  if (createRemote) {
    console.log("");
    console.log("Creating GitHub repo...");
    const result = run(
      `gh repo create ${repoName} --private --source . --push --description "Portable Claude Code config"`,
      { cwd: resolvedDir }
    );
    if (result) {
      console.log(`  Created: ${result}`);
    } else {
      console.log("  Failed to create repo. Run manually:");
      console.log(`  cd ${resolvedDir} && gh repo create ${repoName} --private --source . --push`);
    }
  }

  // Set up launchd
  if (setupLaunchd) {
    console.log("");
    console.log("Setting up auto-push (launchd)...");
    const plistPath = path.join(HOME, "Library", "LaunchAgents", "com.noggin.autopush.plist");
    if (!fs.existsSync(plistPath)) {
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noggin.autopush</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-l</string>
        <string>${resolvedDir}/autopush.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>600</integer>
    <key>StandardOutPath</key>
    <string>/tmp/noggin-autopush.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/noggin-autopush.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;
      fs.mkdirSync(path.dirname(plistPath), { recursive: true });
      fs.writeFileSync(plistPath, plist);
      run(`launchctl load "${plistPath}"`);
      console.log("  Installed and loaded launchd agent");
    } else {
      console.log("  Launchd agent already exists");
    }
  }

  // Install noggin CLI
  if (setupCli) {
    console.log("");
    console.log("Installing noggin CLI...");
    const binDir = path.join(HOME, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const cliTarget = path.join(binDir, "noggin");
    const cliSource = path.join(resolvedDir, "noggin");

    const stat = fs.lstatSync(cliTarget, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) {
      console.log("  noggin already installed");
    } else if (stat) {
      fs.renameSync(cliTarget, `${cliTarget}.bak.${Date.now()}`);
      fs.symlinkSync(cliSource, cliTarget);
      console.log(`  Backed up and linked to ${cliTarget}`);
    } else {
      fs.symlinkSync(cliSource, cliTarget);
      console.log(`  Linked to ${cliTarget}`);
    }

    const currentPath = process.env.PATH || "";
    if (!currentPath.includes(path.join(HOME, "bin"))) {
      const rcFile = (process.env.SHELL || "").includes("zsh") ? ".zshrc" : ".bashrc";
      const rcPath = path.join(HOME, rcFile);
      const rcContent = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, "utf-8") : "";
      if (!rcContent.includes("HOME/bin")) {
        fs.appendFileSync(rcPath, '\nexport PATH="$HOME/bin:$PATH"\n');
        console.log(`  Added ~/bin to PATH in ${rcFile}`);
      }
    }
  }

  // Summary
  console.log("");
  console.log("  noggin is ready!");
  console.log("");
  console.log("  What's set up:");
  console.log(`    Config repo:  ${resolvedDir}`);
  if (!NO_SYMLINK) console.log("    Symlinked:    ~/.claude/skills, scripts, settings.json");
  if (createRemote) console.log(`    GitHub repo:  ${repoName}`);
  if (setupLaunchd) console.log("    Auto-push:    every 10 minutes (launchd)");
  if (setupCli) console.log("    CLI:          noggin status|push|pull|log|diff");
  console.log("");
  console.log("  Hooks:");
  console.log("    SessionStart  auto-pull latest config");
  console.log("    PostToolUse   auto-push on memory/skill writes");
  console.log("    Stop          log session to session-log.md");
  console.log("");
  if (!createRemote) {
    console.log("  To sync across machines:");
    console.log(`    cd ${resolvedDir} && gh repo create claude-noggin --private --source . --push`);
    console.log("");
  }
}

main().catch(console.error);
