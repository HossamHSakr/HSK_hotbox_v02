// Parse folders.txt into a nested menu config for the hotbox
const fs = require('fs');

function parseFoldersTxt(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  const root = { name: 'Main', slices: [], children: [] };
  const stack = [{ indent: -1, node: root }];

  for (let rawLine of lines) {
    let line = rawLine.replace(/\t/g, '    '); // tabs to spaces
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)[0].length;
    const content = line.trim();
    let label = content, target = null;
    if (content.includes('|')) {
      [label, target] = content.split('|').map(s => s.trim());
    }
    const node = { label, target, slices: [], children: [] };
    // Find parent by indentation
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    parent.children.push(node);
    stack.push({ indent, node });
  }

  // Recursively convert children to slices/submenus
  function toMenu(node) {
    if (node.children && node.children.length) {
      return {
        name: node.label || 'Main',
        slices: node.children.map(child => {
          if (child.children && child.children.length) {
            return {
              label: child.label,
              action: 'submenu',
              target: child.label,
              icon: '',
            };
          } else {
            // Determine action type
            let action = 'open_folder';
            if (child.target) {
              if (child.target.endsWith('.cmd') || child.target.endsWith('.bat') || child.target.endsWith('.ahk')) action = 'run_script';
              else if (child.target.endsWith('.exe')) action = 'launch_app';
              else if (child.target.toLowerCase().includes('cmd')) action = 'launch_app';
              else if (child.target.toLowerCase().includes('calc')) action = 'launch_app';
              else if (child.target.toLowerCase().includes('explorer')) action = 'launch_app';
              else action = 'open_folder';
            }
            return {
              label: child.label,
              action,
              target: child.target,
              icon: '',
            };
          }
        })
      };
    }
    return null;
  }

  // Flatten all menus
  function collectMenus(node, acc = []) {
    const menu = toMenu(node);
    if (menu) acc.push(menu);
    if (node.children) node.children.forEach(child => collectMenus(child, acc));
    return acc;
  }

  return collectMenus(root);
}

module.exports = parseFoldersTxt;