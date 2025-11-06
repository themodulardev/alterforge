#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import shell from 'shelljs';
import chalk from 'chalk';

const program = new Command();

program
  .name('alterforge')
  .description('CLI to scaffold modular microservices with Node.js, GraphQL, gRPC, Sequelize, Docker, and CI/CD')
  .version('3.5.0');

/**
 * Command: alterforge init <projectName>
 */
program
  .command('init <projectName>')
  .description('Initialize a new microservice architecture with GitHub Actions CI/CD')
  .action(async (projectName) => {
    const projectPath = path.join(process.cwd(), projectName);
    if (fs.existsSync(projectPath)) {
      console.log(chalk.red(`❌ Folder ${projectName} already exists.`));
      process.exit(1);
    }


    const { database } = await inquirer.prompt([
      {
        type: 'list',
        name: 'database',
        message: 'Select the default database for your project:',
        choices: ['MySQL', 'PostgreSQL'],
        default: 'PostgreSQL'
      }
    ]);

    console.log(chalk.blue(`🚀 Initializing project: ${projectName}...`));
    fs.mkdirSync(projectPath);

    const dockerPath = path.join(projectPath, 'docker');
    const servicesPath = path.join(projectPath, 'services');
    const githubPath = path.join(projectPath, '.github', 'workflows');
    fs.mkdirSync(dockerPath, { recursive: true });
    fs.mkdirSync(servicesPath);
    fs.mkdirSync(githubPath, { recursive: true });

    // ✅ dynamic DB compose content
    const dbService = database === 'MySQL' ? `
  mysql:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: microdb
      MYSQL_USER: root
      MYSQL_PASSWORD: root
    ports:
      - "3306:3306"
    volumes:
      db_data:
` : `
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: microdb
    ports:
      - "5432:5432"
    volumes:
      db_data:
`;

    const dbVolume = database === 'MySQL' ? 'mysql_data:' : 'db_data:';

    fs.writeFileSync(path.join(dockerPath, 'docker-compose.yml'), `
version: '3.9'
services:
${dbService}
volumes:
  ${dbVolume}
`);

    // CI/CD workflow
    const workflowFile = path.join(githubPath, 'ci-cd.yml');
    fs.writeFileSync(workflowFile, `
name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [core]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd services/\${{ matrix.service }}
          npm install

      - name: Run tests
        run: echo "🧪 Tests placeholder - add Jest or Mocha here"

      - name: Build Docker image
        run: |
          docker build -t ghcr.io/\${{ github.repository_owner }}/\${{ matrix.service }}:latest services/\${{ matrix.service }}

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.repository_owner }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Push Docker image
        run: docker push ghcr.io/\${{ github.repository_owner }}/\${{ matrix.service }}:latest
`);

    // ESLint + Prettier
    fs.writeFileSync(path.join(projectPath, '.eslintrc.json'), JSON.stringify({
      env: { es2021: true, node: true },
      extends: ['eslint:recommended'],
      parserOptions: { ecmaVersion: 12, sourceType: 'module' },
      rules: {},
    }, null, 2));

    fs.writeFileSync(path.join(projectPath, '.prettierrc'), JSON.stringify({
      semi: true,
      singleQuote: true,
      tabWidth: 2,
    }, null, 2));

    // Git initialization
    shell.cd(projectPath);
    shell.exec('git init');
    shell.exec('git add .');
    shell.exec('git commit -m "Initial alterforge setup with CI/CD"');

    // Create default service
    await createService('core', servicesPath, dockerPath, workflowFile);

    console.log(chalk.green(`✅ Project ${projectName} initialized with GitHub CI/CD!`));
    console.log(chalk.yellow(`👉 cd ${projectName} && alterforge add-service auth`));
    console.log(chalk.yellow('🚀 Starting Docker containers...'));
    shell.exec(`docker compose -f ${path.join(dockerPath, 'docker-compose.yml')} up -d --build`);

  });

/**
 * Command: add-service
 */
program
  .command('add-service <serviceName>')
  .description('Add a new service and update CI/CD')
  .action(async (serviceName) => {
    const rootPath = process.cwd();
    const servicesPath = path.join(rootPath, 'services');
    const dockerPath = path.join(rootPath, 'docker');
    const workflowFile = path.join(rootPath, '.github', 'workflows', 'ci-cd.yml');

    if (!fs.existsSync(servicesPath)) {
      console.log(chalk.red('❌ Not a valid alterforge project (missing services/ folder).'));
      process.exit(1);
    }
    await createService(serviceName, servicesPath, dockerPath, workflowFile);
  });



async function createService(name, basePath, dockerPath, workflowFile) {
  const servicePath = path.join(basePath, name);
  if (fs.existsSync(servicePath)) {
    console.log(chalk.red(`❌ Service "${name}" already exists.`));
    return;
  }

  const { features } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: `Select features for ${name} service:`,
      choices: ['Sequelize', 'GraphQL', 'gRPC', 'REST'],
      default: ['Sequelize', 'REST']
    }
  ]);

  let database = null;
  if (features.includes('Sequelize')) {
    const dbAns = await inquirer.prompt([
      {
        type: 'list',
        name: 'database',
        message: 'Select your database:',
        choices: ['MySQL', 'PostgreSQL']
      }
    ]);
    database = dbAns.database;
  }

  console.log(chalk.blue(`⚙️ Creating service: ${name}...`));
  fs.mkdirSync(servicePath, { recursive: true });
  fs.mkdirSync(path.join(servicePath, 'src'));
  fs.mkdirSync(path.join(servicePath, 'src', 'models'));

  // Random port
  const port = Math.floor(Math.random() * 4000) + 3000;

  // Base dependencies
  const dependencies = {
    express: '^4.18.2',
    dotenv: '^16.0.3'
  };
  const devDependencies = {
    nodemon: '^3.1.0',
    typescript: '^5.0.4',
    '@types/node': '^20.3.3',
    '@types/express': '^4.17.21',
    'ts-node': '^10.9.2'
  };

  // Add feature-specific dependencies
  if (features.includes('GraphQL')) {
    Object.assign(dependencies, {
      graphql: '^16.8.1',
      '@apollo/server': '^4.10.0',
      'body-parser': '^1.20.2',
      cors: '^2.8.5',
      express: '^4.18.2'
    });
  }

  if (features.includes('gRPC')) {
    Object.assign(dependencies, {
      '@grpc/grpc-js': '^1.9.9',
      '@grpc/proto-loader': '^0.7.9'
    });
  }

  if (features.includes('Sequelize')) {
    dependencies['sequelize'] = '^6.35.0';
    if (database === 'MySQL') {
      dependencies['mysql2'] = '^3.9.0';
    } else if (database === 'PostgreSQL') {
      dependencies['pg'] = '^8.11.0';
      dependencies['pg-hstore'] = '^2.3.4';
    }
  }


  // 🔧 Ensure Docker Compose has the correct DB service
  const composeFile = path.join(dockerPath, 'docker-compose.yml');
  let compose = fs.readFileSync(composeFile, 'utf8');

  if (features.includes('Sequelize')) {
    if (database === 'MySQL' && !compose.includes('mysql:')) {
      console.log(chalk.blue('🧩 Adding MySQL service to Docker Compose...'));
      compose += `
  mysql:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: microdb
      MYSQL_USER: root
      MYSQL_PASSWORD: root
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
`;

      // ✅ Add volumes section only once
      if (!compose.includes('volumes:')) {
        compose += `
volumes:
  mysql_data:
`;
      }

      fs.writeFileSync(composeFile, compose);
    } else if (database === 'PostgreSQL' && !compose.includes('postgres:')) {
      console.log(chalk.blue('🧩 Adding PostgreSQL service to Docker Compose...'));
      compose += `
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: microdb
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
`;
      fs.writeFileSync(composeFile, compose);
    }
  }


  const { frontend } = await inquirer.prompt([
    {
      type: 'list',
      name: 'frontend',
      message: 'Do you want to include a frontend for this service?',
      choices: ['None', 'React', 'Angular'],
      default: 'None'
    }
  ]);


  if (frontend === 'React') {
    const result = shell.exec(`npx create-react-app@latest ${name}-frontend`, { silent: false });
    if (result.code !== 0) console.log(chalk.red('⚠️ React setup failed. Ensure npm permissions are correct.'));
  } else if (frontend === 'Angular') {
    const result = shell.exec(`npx @angular/cli new ${name}-frontend --defaults --skip-git`, { silent: false });
    if (result.code !== 0) console.log(chalk.red('⚠️ Angular setup failed. Ensure @angular/cli is installed.'));
  }


  // Write package.json dynamically
  fs.writeFileSync(path.join(servicePath, 'package.json'), JSON.stringify({
    name: `${name}-service`,
    version: '1.0.0',
    type: 'module',
    scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
    dependencies,
    devDependencies
  }, null, 2));

  // Env and index
  // fs.writeFileSync(path.join(servicePath, '.env'), `PORT=${port}\nDATABASE_URL=postgres://postgres:postgres@db:5432/microdb`);

  let dbUrl = '';
  if (features.includes('Sequelize')) {
    dbUrl = database === 'MySQL'
      ? 'mysql://root:root@mysql:3306/microdb'
      : 'postgres://postgres:postgres@db:5432/microdb';
  }

  fs.writeFileSync(
    path.join(servicePath, '.env'),
    `PORT=${port}\nDATABASE_URL=${dbUrl}`
  );

  fs.writeFileSync(path.join(servicePath, 'src', 'index.js'), `
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const app = express();

app.use(express.json());
app.get('/', (req, res) => res.send('Hello from ${name} service!'));

const PORT = process.env.PORT || ${port};
app.listen(PORT, () => console.log(\`🚀 ${name} running on port \${PORT}\`));
`);

  // Sequelize
  if (features.includes('Sequelize')) {
    fs.writeFileSync(path.join(servicePath, 'src', 'models', 'index.js'),
      `import { Sequelize } from 'sequelize';
const sequelize = new Sequelize(process.env.DATABASE_URL);
export default sequelize;`);
  }

  // GraphQL
  if (features.includes('GraphQL')) {
    const gqlDir = path.join(servicePath, 'src', 'graphql');
    fs.mkdirSync(gqlDir);
    fs.writeFileSync(path.join(gqlDir, 'schema.js'),
      `import { buildSchema } from 'graphql';
export const schema = buildSchema(\`
  type Query { hello: String }
\`);
export const root = { hello: () => 'Hello GraphQL from ${name}' };`);
  }

  // gRPC
  if (features.includes('gRPC')) {
    const grpcDir = path.join(servicePath, 'src', 'grpc');
    fs.mkdirSync(grpcDir);
    fs.writeFileSync(path.join(grpcDir, 'service.proto'),
      `syntax = "proto3";
service ${name}Service {
  rpc SayHello (HelloRequest) returns (HelloReply);
}
message HelloRequest { string name = 1; }
message HelloReply { string message = 1; }`);
  }

  // Dockerfile
  fs.writeFileSync(path.join(servicePath, 'Dockerfile'), `
FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${port}
CMD ["npm", "start"]
`);

  // Update docker-compose.yml safely — insert service before volumes section
  const dbServiceName = database === 'MySQL' ? 'mysql' : 'db';

  // Read the compose file
  let composeContent = fs.readFileSync(composeFile, 'utf8');

  // Split file at the 'volumes:' section (if it exists)
  const [beforeVolumes, afterVolumes] = composeContent.split(/volumes:/);

  // Define the new service block
  const newServiceBlock = `
  ${name}:
    build: ../services/${name}
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=development
      - PORT=${port}
    depends_on:
      - ${dbServiceName}
`;

  // Insert new service block *before* volumes section
  let updatedCompose;
  if (beforeVolumes) {
    // if the file already has services and volumes
    // updatedCompose = beforeVolumes.trimEnd() + '\n' + newServiceBlock + '\nvolumes:' + (afterVolumes ? afterVolumes : '');
    updatedCompose = beforeVolumes.trimEnd() + '\n' + newServiceBlock + '\n\nvolumes:' + (afterVolumes ? afterVolumes : '');

  } else {
    // fallback if no volumes section found (edge case)
    updatedCompose = composeContent.trimEnd() + '\n' + newServiceBlock;
  }

  // Write back to file
  fs.writeFileSync(composeFile, updatedCompose);


  // Update GitHub workflow matrix
  if (fs.existsSync(workflowFile)) {
    let workflow = fs.readFileSync(workflowFile, 'utf8');
    const match = workflow.match(/matrix:\s+service:\s+\[(.*?)\]/);
    if (match) {
      const services = match[1].split(',').map(s => s.trim()).filter(Boolean);
      if (!services.includes(name)) services.push(name);
      const newMatrix = `matrix:\n        service: [${services.join(', ')}]`;
      workflow = workflow.replace(/matrix:\s+service:\s+\[.*?\]/, newMatrix);
      fs.writeFileSync(workflowFile, workflow);
    }
  }

  console.log(chalk.green(`✅ Service ${name} created with dependencies and added to CI/CD.`));

  // Auto-install
  shell.cd(servicePath);
  console.log(chalk.yellow(`📦 Installing dependencies for ${name}...`));
  shell.exec('npm install', { silent: false });
}

/**
 * Docker utilities
 */
program
  .command('up')
  .description('Run all services using Docker Compose')
  .action(() => {
    const dockerCompose = path.join(process.cwd(), 'docker', 'docker-compose.yml');
    if (!fs.existsSync(dockerCompose)) {
      console.log(chalk.red('❌ docker-compose.yml not found.'));
      process.exit(1);
    }
    shell.exec(`docker compose -f ${dockerCompose} up -d --build`);
  });

program
  .command('build')
  .description('Build all Docker services')
  .action(() => {
    const dockerCompose = path.join(process.cwd(), 'docker', 'docker-compose.yml');
    shell.exec(`docker compose -f ${dockerCompose} build`);
  });

program.parse(process.argv);
