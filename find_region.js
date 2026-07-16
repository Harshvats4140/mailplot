const fs = require('fs');

async function main() {
  console.log('Reading local AWS IP ranges...');
  const fileContent = fs.readFileSync('e:\\htmlemail\\ip-ranges.json', 'utf8');
  const data = JSON.parse(fileContent);
  
  const targetIp = '2406:da14:25a:5801:a343:e4ef:6dfc:3cdb';
  console.log('Searching for matching IPv6 prefix for target:', targetIp);
  
  const targetParts = targetIp.split(':').map(x => parseInt(x, 16));
  const matches = [];
  
  for (const prefix of data.ipv6_prefixes) {
    const cidr = prefix.ipv6_prefix;
    const [ipPart, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr);
    const ipParts = ipPart.split(':').map(x => x ? parseInt(x, 16) : 0);
    while (ipParts.length < 8) ipParts.push(0);
    
    let match = true;
    let bitOffset = 0;
    for (let i = 0; i < 8; i++) {
      const remainingBits = bits - bitOffset;
      if (remainingBits <= 0) break;
      
      const mask = remainingBits >= 16 ? 0xFFFF : (0xFFFF << (16 - remainingBits)) & 0xFFFF;
      const targetVal = targetParts[i] || 0;
      const prefixVal = ipParts[i] || 0;
      
      if ((targetVal & mask) !== (prefixVal & mask)) {
        match = false;
        break;
      }
      bitOffset += 16;
    }
    
    if (match) {
      matches.push(prefix);
    }
  }
  
  console.log('Matches:', matches);
}

main();
