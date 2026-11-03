const fs = require('fs');
const path = require('path');

const targetPkg = path.join(__dirname, '../node_modules/whatsapp-rust-bridge/package.json');

if (fs.existsSync(targetPkg)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(targetPkg, 'utf8'));
    let modified = false;

    if (!pkg.main) {
      pkg.main = './dist/index.js';
      modified = true;
    }

    if (pkg.exports && pkg.exports['.']) {
      if (!pkg.exports['.'].require) {
        pkg.exports['.'].require = './dist/index.js';
        modified = true;
      }
      if (!pkg.exports['.'].default) {
        pkg.exports['.'].default = './dist/index.js';
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(targetPkg, JSON.stringify(pkg, null, 2));
      console.log('✅ Successfully patched whatsapp-rust-bridge package.json');
    }
  } catch (err) {
    console.warn('⚠️ Could not patch whatsapp-rust-bridge:', err.message);
  }
}
