const fs = require('fs');

const oldRoutes = JSON.parse(fs.readFileSync('old_routes.json', 'utf8'));
const nestRoutes = JSON.parse(fs.readFileSync('nest_routes.json', 'utf8'));

// Convert to sets for easy comparison
const oldSet = new Set();
oldRoutes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  oldSet.add(key);
});

const nestSet = new Set();
nestRoutes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  nestSet.add(key);
});

console.log('=== ROUTE COMPARISON ===\n');

console.log(`Old backend routes: ${oldRoutes.length}`);
console.log(`NestJS routes: ${nestRoutes.length}\n`);

// Find missing routes (in old but not in nest)
const missingInNest = [];
oldRoutes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  if (!nestSet.has(key)) {
    missingInNest.push(route);
  }
});

// Find extra routes (in nest but not in old)
const extraInNest = [];
nestRoutes.forEach(route => {
  const key = `${route.method}:${route.path}`;
  if (!oldSet.has(key)) {
    extraInNest.push(route);
  }
});

console.log(`Missing in NestJS backend (${missingInNest.length} routes):`);
missingInNest.forEach(route => {
  console.log(`  ${route.method} ${route.path}`);
});

console.log(`\nExtra in NestJS backend (${extraInNest.length} routes):`);
extraInNest.forEach(route => {
  console.log(`  ${route.method} ${route.path}`);
});

console.log('\n=== DETAILED MISSING ROUTES ===');
missingInNest.forEach(route => {
  console.log(`${route.method.padEnd(6)} ${route.path}`);
});

// Write missing routes to file for reference
fs.writeFileSync('missing_routes.json', JSON.stringify(missingInNest, null, 2));
console.log('\nSaved missing routes to missing_routes.json');