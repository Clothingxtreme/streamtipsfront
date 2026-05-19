const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'NewBackend', 'src');
const routeRegex = /@(Get|Post|Put|Delete|Patch|All|Use)\s*(?:\(\s*['"]([^'"]+)['"]\s*\))?/g;

// Function to extract routes from a file
function extractRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let routePath = match[2] || ''; // If no path provided, it's an empty string (root of controller)
    routes.push({ method, route: routePath });
  }
  return routes;
}

// Function to walk directories and collect .ts files
function getTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsFiles(filePath));
    } else {
      if (filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

// Get all .ts files in src
const tsFiles = getTsFiles(srcDir);
// Filter to only controller files (those ending with .controller.ts)
const controllerFiles = tsFiles.filter(f => f.endsWith('.controller.ts'));

console.log(`Found ${controllerFiles.length} controller files:`);
// controllerFiles.forEach(f => console.log(f));

// Extract routes from each controller
const allRoutes = [];
controllerFiles.forEach(file => {
  const routes = extractRoutesFromFile(file);
  // We need to prefix with the controller's @Controller path
  // Let's read the file again to get the controller decorator
  const content = fs.readFileSync(file, 'utf8');
  const controllerMatch = content.match(/@Controller\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  const controllerPath = controllerMatch ? controllerMatch[1] : '';
  routes.forEach(route => {
    // Combine controller path and route path
    let fullPath = controllerPath;
    if (controllerPath && !controllerPath.endsWith('/') && route.route && !route.route.startsWith('/')) {
      fullPath += '/';
    }
    fullPath += route.route;
    // Ensure it starts with /
    if (!fullPath.startsWith('/')) {
      fullPath = '/' + fullPath;
    }
    allRoutes.push({ method: route.method, path: fullPath, file });
  });
});

// Remove duplicates (same method and path)
const uniqueRoutes = [];
const seen = new Set();
allRoutes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRoutes.push(route);
  }
});

// Sort by method then path
uniqueRoutes.sort((a, b) => {
  if (a.method < b.method) return -1;
  if (a.method > b.method) return 1;
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
});

console.log(`\nExtracted ${uniqueRoutes.length} unique routes from NestJS controllers:\n`);
uniqueRoutes.forEach(r => {
  console.log(`${r.method.padEnd(6)} ${r.path}`);
});

// Save to file for comparison
fs.writeFileSync(path.join(__dirname, 'nest_routes.json'), JSON.stringify(uniqueRoutes, null, 2));
console.log('\nSaved to nest_routes.json');