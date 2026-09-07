import fs from 'node:fs';
import path from 'node:path';
const [release, data, backup, output] = process.argv.slice(2);
if (![release, data, backup, output].every(p => p && path.isAbsolute(p)) || fs.existsSync(output)) throw new Error('Usage: node scripts/service-config.mjs /release /private/data /backup-volume/directory /new/output-directory');
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
function plist(label, script, schedule) {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${escape(process.execPath)}</string><string>${escape(path.join(release, 'scripts', script))}</string></array>
<key>WorkingDirectory</key><string>${escape(release)}</string><key>EnvironmentVariables</key><dict><key>VAC_DATA_DIR</key><string>${escape(data)}</string><key>VAC_BACKUP_DIR</key><string>${escape(backup)}</string><key>PORT</key><string>3001</string></dict>
<key>Umask</key><integer>63</integer>${schedule}</dict></plist>`;
}
fs.writeFileSync(path.join(output, 'com.theo.vac.plist'), plist('com.theo.vac', 'supervise.mjs', '<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>'));
fs.writeFileSync(path.join(output, 'com.theo.vac.backup.plist'), plist('com.theo.vac.backup', 'backup-policy.mjs', '<key>StartInterval</key><integer>86400</integer><key>RunAtLoad</key><true/>'));
console.log('Generated launchd configuration only; nothing installed or started.');
