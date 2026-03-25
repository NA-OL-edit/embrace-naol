const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

https.get('https://api.github.com/repos/pocketbase/pocketbase/releases/latest', { headers: { 'User-Agent': 'Node.js' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            // Search all assets for the correct windows_amd64.zip
            const assetInfo = json.assets.find(a => 
                a.name && typeof a.name === 'string' && a.name.includes('windows_amd64.zip')
            );
            
            if (!assetInfo) throw new Error("Could not find windows_amd64.zip asset");
            
            if (!fs.existsSync('pocketbase')) fs.mkdirSync('pocketbase');
            console.log("Downloading " + assetInfo.browser_download_url + " ...");
            
            execSync(`curl.exe -sL -o pocketbase\\pb.zip "${assetInfo.browser_download_url}"`);
            
            console.log("Extracting...");
            execSync(`tar.exe -xf pb.zip`, { cwd: 'pocketbase' });
            fs.unlinkSync(`pocketbase\\pb.zip`);
            
            console.log("Success! pocketbase.exe is ready.");
        } catch(e) {
            console.error("Error occurred: ", e);
        }
    });
});
