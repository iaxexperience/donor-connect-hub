const fs = require('fs');
const path = 'd:/Nova pasta/donor-connect-hub/src/pages/WhatsApp.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /(<\/Table>)\s+(<\/CardContent>)/;
if (regex.test(content)) {
    const newContent = content.replace(regex, '$1\n                     </div>\n                  $2');
    fs.writeFileSync(path, newContent);
    console.log('Successfully fixed WhatsApp.tsx');
} else {
    console.log('Regex did not match. Trying alternative...');
    const regex2 = /<\/Table>(\r?\n\s+)<\/CardContent>/;
    if (regex2.test(content)) {
        const newContent = content.replace(regex2, '<\/Table>$1</div>$1<\/CardContent>');
        fs.writeFileSync(path, newContent);
        console.log('Successfully fixed WhatsApp.tsx (regex2)');
    } else {
        console.log('Could not find the target location in WhatsApp.tsx');
    }
}
