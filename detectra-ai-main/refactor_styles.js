import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove base body overrides, assume Layout.tsx handles bg-black
    content = content.replace(/\bbg-gray-950\b/g, 'bg-transparent');
    content = content.replace(/\bbg-slate-950\b/g, 'bg-transparent');
    
    // Transparent layers mapping to black
    content = content.replace(/\bbg-gray-950(\/[0-9]+)\b/g, 'bg-black$1');
    content = content.replace(/\bbg-slate-950(\/[0-9]+)\b/g, 'bg-black$1');

    // 2. Convert standard card backgrounds to glassmorphism
    // Since card-glass is a custom Component class, it cannot be prefixed with hover:
    // We only replace non-prefixed bg-gray-900 and bg-slate-900
    content = content.replace(/(?<![:-])\bbg-gray-900(\/[0-9]+)?\b/g, 'bg-white/5 backdrop-blur-md');
    // For hover:bg-gray-900, we map to hover:bg-white/10
    content = content.replace(/\bhover:bg-gray-900(\/[0-9]+)?\b/g, 'hover:bg-white/10');

    content = content.replace(/(?<![:-])\bbg-slate-900(\/[0-9]+)?\b/g, 'bg-white/5 backdrop-blur-md');
    content = content.replace(/\bhover:bg-slate-900(\/[0-9]+)?\b/g, 'hover:bg-white/10');

    // 3. Convert borders to soft white-alpha
    content = content.replace(/\bborder-gray-800\b/g, 'border-white/10');
    content = content.replace(/\bborder-slate-800\b/g, 'border-white/10');
    content = content.replace(/\bborder-gray-700\b/g, 'border-white/20');
    content = content.replace(/\bborder-slate-700\b/g, 'border-white/20');

    // 4. Secondary backgrounds (e.g. inner regions, inputs, hover states)
    content = content.replace(/(?<![:-])\bbg-gray-800(\/[0-9]+)?\b/g, 'bg-white/10');
    content = content.replace(/\bhover:bg-gray-800(\/[0-9]+)?\b/g, 'hover:bg-white/20');
    
    content = content.replace(/(?<![:-])\bbg-slate-800(\/[0-9]+)?\b/g, 'bg-white/10');
    content = content.replace(/\bhover:bg-slate-800(\/[0-9]+)?\b/g, 'hover:bg-white/20');

    // 5. Replace explicit card-dark with card-glass to ensure alignment
    content = content.replace(/\bcard-dark\b/g, 'card-glass');
    content = content.replace(/\bcard-dark-hover\b/g, 'card-glass hover:border-white/20 transition-all');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceInFile(fullPath);
        }
    }
}

walkDir('./src/pages');
walkDir('./src/components');
