const fs = require('fs');
const path = 'd:/Nova pasta/donor-connect-hub/src/pages/WhatsApp.tsx';
let content = fs.readFileSync(path, 'utf8');

// The unclosed div starts at line 453: <div className="min-w-[600px]">
// It should be closed before </CardContent> at line 491.

const searchString = `                        </TableBody>\r\n                     </Table>\r\n                  </CardContent>`;
const replacementString = `                        </TableBody>\r\n                     </Table>\r\n                  </div>\r\n               </CardContent>`;

// Wait, the indentation might be different. Let's use a more robust regex.
// We want to find </Table> followed by </CardContent> and insert </div>.

const regex = /(<\/Table>)\s+(<\/CardContent>)/;
if (regex.test(content)) {
    const newContent = content.replace(regex, '$1\r\n                     </div>\r\n                  $2');
    fs.writeFileSync(path, newContent);
    console.log('Successfully fixed WhatsApp.tsx');
} else {
    // Try with \n only
    const regex2 = /(<\/Table>)\s+(<\/CardContent>)/;
    const newContent = content.replace(regex2, '$1\n                     </div>\n                  $2');
    fs.writeFileSync(path, newContent);
    console.log('Successfully fixed WhatsApp.tsx (fallback)');
}
