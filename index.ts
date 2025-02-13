import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import fs from 'fs/promises';
const { terminal: term } = require('terminal-kit');

const SECRET_FILE = 'secret.txt';

// Function to generate and save TOTP secret
async function generateSecret(): Promise<string> {
    const secret = authenticator.generateSecret();
    await fs.writeFile(SECRET_FILE, secret);
    return secret;
}

// Function to read existing secret
async function getSecret(): Promise<string | null> {
    try {
        return await fs.readFile(SECRET_FILE, 'utf-8');
    } catch {
        return null;
    }
}

// Function to generate QR code
async function generateQRCode(secret: string): Promise<string> {
    const otpauth = authenticator.keyuri('user', 'TOTP CLI App', secret);
    try {
        return await qrcode.toString(otpauth, {
            errorCorrectionLevel: 'L',
            width: 20
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
}

// Function to verify TOTP token
function verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
}

// Display header
async function showHeader() {
    term.clear();
    term.brightBlue('\n╔════════════════════════════════╗\n');
    term.brightBlue('║         TOTP CLI App          ║\n');
    term.brightBlue('╚════════════════════════════════╝\n\n');
}

// Show main menu
async function showMainMenu(): Promise<string> {
    const options = [
        'Generate New TOTP Secret',
        'Show QR Code',
        'Verify Token',
        'Exit'
    ];
    
    term.brightYellow('Select an option:\n\n');
    
    const response = await term.singleColumnMenu(options).promise;
    
    return options[response.selectedIndex];
}

// Get token input from user
async function getTokenInput(): Promise<string> {
    term.brightYellow('\nEnter your 6-digit token: ');
    const input = await term.inputField().promise;
    return input || '';
}

// Main application loop
async function main() {
    while (true) {
        await showHeader();
        const choice = await showMainMenu();
        
        switch (choice) {
            case 'Generate New TOTP Secret': {
                const secret = await generateSecret();
                term.brightGreen('\nNew TOTP secret generated and saved!\n');
                term.brightWhite('\nSecret: ' + secret + '\n');
                break;
            }
            
            case 'Show QR Code': {
                const secret = await getSecret();
                if (!secret) {
                    term.red('\nNo secret found! Please generate one first.\n');
                    break;
                }
                const qr = await generateQRCode(secret);
                term.brightWhite('\nScan this QR code with your authenticator app:\n\n');
                console.log(qr);
                break;
            }
            
            case 'Verify Token': {
                const secret = await getSecret();
                if (!secret) {
                    term.red('\nNo secret found! Please generate one first.\n');
                    break;
                }
                const token = await getTokenInput();
                if (!token) {
                    term.red('\nToken is required!\n');
                    break;
                }
                const isValid = verifyToken(secret, token);
                if (isValid) {
                    term.brightGreen('\nToken is valid!\n');
                } else {
                    term.red('\nInvalid token!\n');
                }
                break;
            }
            
            case 'Exit': {
                term.brightYellow('\nGoodbye!\n');
                process.exit(0);
            }
        }
        
        term.brightYellow('\nPress ENTER to continue...');
        await term.inputField().promise;
    }
}

// Start the application
main().catch(console.error);

// Handle exit
term.on('key', (key: string) => {
    if (key === 'CTRL_C') {
        term.brightYellow('\nGoodbye!\n');
        process.exit();
    }
});