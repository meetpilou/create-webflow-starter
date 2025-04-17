#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import prompts from 'prompts'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('\n🚀 Create a new webflow project\n')

async function main() {
  const response = await runPrompts()

  const projectPath = response.createFolder
    ? path.resolve(process.cwd(), response.projectName)
    : process.cwd()

  if (response.createFolder) {
    fs.mkdirSync(projectPath, { recursive: true })
    console.log('📁 Creating project at:', projectPath)
  } else {
    console.log('📁 Installing in current folder:', projectPath)
  }

  copyTemplateFiles(projectPath)
  writeFlowConfig(response, projectPath)
  writePackageJson(response, projectPath)

  if (response.gitMode !== 'none') {
    await checkOrCreateSSHKey()
    await checkOrLoginGitHubWithSSH()
    await addSSHKeyToGitHubIfNeeded()
  }

  await finalizeSetup(projectPath, response)
}

main()

// FUNCTIONS

async function runPrompts() {
  // const projectsResponse = await prompts({
  //   type: 'select',
  //   name: 'templateType',
  //   message: 'Select the type of project:',
  //   choices: [{ title: 'Webflow', value: 'webflow' }],
  //   initial: 0,
  // })

  // if (projectsResponse.templateType !== 'webflow') {
  //   console.log('❌ Only Webflow projects are supported for now.')
  //   process.exit(1)
  // }

  const basicResponse = await prompts(
    [
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'my-webflow-project',
      },
      {
        type: 'toggle',
        name: 'createFolder',
        message: 'Create a new folder for the project?',
        initial: true,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'select',
        name: 'gitMode',
        message: 'How do you want to manage Git repositories?',
        choices: [
          { title: 'None (no remote Git setup)', value: 'none' },
          { title: 'Single public repo (source + dist)', value: 'public-only' },
          {
            title: 'Private source repo + public production repo',
            value: 'split',
          },
        ],
        initial: 1,
      },
    ],
    {
      onCancel: () => {
        console.log('❌ Operation cancelled.')
        process.exit(1)
      },
    }
  )

  let extraResponse = {
    cdnUser: '',
    isOrg: false,
    cdnBranch: 'main',
  }

  if (basicResponse.gitMode !== 'none') {
    extraResponse = await prompts([
      {
        type: 'text',
        name: 'cdnUser',
        message: 'GitHub user/org for CDN :',
      },
      {
        type: 'toggle',
        name: 'isOrg',
        message: 'Is this a GitHub organization?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'text',
        name: 'cdnBranch',
        message: 'Branch name:',
        initial: 'main',
      },
    ])
  }

  let publicRepoName = ''
  if (basicResponse.gitMode === 'split') {
    const { name } = await prompts({
      type: 'text',
      name: 'name',
      message: 'Name for the public production repo:',
      initial: `${basicResponse.projectName}-prod`,
      validate: (value) => (value?.trim() ? true : 'This field is required.'),
    })
    publicRepoName = name.trim()
  }

  const cdnRepo =
    basicResponse.gitMode === 'split'
      ? publicRepoName
      : basicResponse.projectName

  return {
    ...basicResponse,
    ...extraResponse,
    cdnRepo,
    deployPublicRepo: cdnRepo,
  }
}

function copyTemplateFiles(projectPath) {
  const templatePath = path.join(__dirname, '../templates/base')
  fs.cpSync(templatePath, projectPath, {
    recursive: true,
    filter: () => true,
  })

  const gitignorePath = path.join(projectPath, 'gitignore')
  const newGitignorePath = path.join(projectPath, '.gitignore')
  if (fs.existsSync(gitignorePath))
    fs.renameSync(gitignorePath, newGitignorePath)
}

function writeFlowConfig(response, projectPath) {
  const orgLine = response.isOrg ? `\n    org: true,` : ''

  const config = `export default {

  cdn: {
    baseUrl: 'https://cdn.jsdelivr.net/gh',
    user: '${response.cdnUser}',
    repo: '${response.cdnRepo}',
    branch: '${response.cdnBranch}',${orgLine}
  },
  deploy: {
    mode: '${response.gitMode}',${
    response.gitMode !== 'none'
      ? `\n    publicRepo: '${response.deployPublicRepo}',`
      : ''
  }${
    response.gitMode === 'split'
      ? `\n    privateRepo: '${response.projectName}',`
      : ''
  }
    branch: '${response.cdnBranch}'
  }
}`

  fs.writeFileSync(path.join(projectPath, 'starter.config.js'), config, 'utf-8')
}

function writePackageJson(response, projectPath) {
  const pkgJson = {
    name: response.projectName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      'build:pages': 'PAGES=true vite build',
      deploy: 'node scripts/deploy.js',
      format: 'prettier --write .',
      lint: 'eslint src --ext .js',
    },
    devDependencies: {
      vite: '^6.2.0',
      eslint: '^9.24.0',
      'eslint-config-prettier': '^10.1.2',
      globals: '^16.0.0',
      prettier: '^3.5.3',
      '@eslint/js': '^9.24.0',
      '@kobonostudio/vite-plugin-github-deploy': 'latest',
      '@kobonostudio/vite-plugin-webflow-bundler': 'latest',
    },
  }

  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  )
}

async function checkOrCreateSSHKey() {
  const sshDir = path.join(os.homedir(), '.ssh')
  const keyPath = path.join(sshDir, 'id_ed25519')
  const pubKeyPath = keyPath + '.pub'

  if (fs.existsSync(keyPath) && fs.existsSync(pubKeyPath)) {
    console.log('✅ SSH key (id_ed25519) found.')
    return
  }

  console.warn('🔐 No SSH key (id_ed25519) found.')
  const { generateSSH } = await prompts({
    type: 'confirm',
    name: 'generateSSH',
    message: 'Generate a new SSH key (ed25519) for GitHub?',
    initial: true,
  })

  if (!generateSSH) {
    console.log('👉 You can generate it manually with:')
    console.log('   ssh-keygen -t ed25519 -C "your-email@example.com"')
    return
  }

  const { email } = await prompts({
    type: 'text',
    name: 'email',
    message: 'Enter the email to associate with your SSH key:',
    validate: (val) => (val.includes('@') ? true : 'Invalid email format'),
  })

  console.log('🔧 Generating key...')
  execSync(`ssh-keygen -t ed25519 -C "${email.trim()}" -f ${keyPath} -N ""`, {
    stdio: 'inherit',
  })

  console.log(`✅ SSH key generated at: ${keyPath}`)
}

async function checkOrLoginGitHubWithSSH() {
  try {
    execSync('gh auth status', { stdio: 'pipe' })
    console.log('✅ GitHub CLI is authenticated with SSH.')
  } catch {
    console.warn('\n⚠️ GitHub CLI not authenticated. Running gh auth login...')
    execSync('gh auth login', { stdio: 'inherit' })

    try {
      execSync('gh auth status', { stdio: 'pipe' })
    } catch {
      console.error('❌ Still not authenticated. Aborting.')
      process.exit(1)
    }
  }
}

async function addSSHKeyToGitHubIfNeeded() {
  const pubKeyPath = path.join(os.homedir(), '.ssh/id_ed25519.pub')
  const pubKeyContent = fs.readFileSync(pubKeyPath, 'utf-8').trim()
  let keyExists = false

  try {
    const listOutput = execSync('gh ssh-key list', { encoding: 'utf-8' })
    const pubKeyPrefix = pubKeyContent.split(' ').slice(0, 2).join(' ')
    keyExists = listOutput.includes(pubKeyPrefix)
  } catch (err) {
    const warning = err.stderr?.toString() || err.message
    if (warning.includes('ssh_signing_keys')) {
      console.warn(
        '⚠️ GitHub API warning (signing key scope missing): ignored.'
      )
    } else {
      console.error('❌ Failed to check SSH keys on GitHub.')
      process.exit(1)
    }
  }

  if (keyExists) {
    console.log('✅ SSH key already exists on GitHub.')
    return
  }

  const { confirmAdd } = await prompts({
    type: 'confirm',
    name: 'confirmAdd',
    message: 'Do you want to add your SSH key to GitHub now?',
    initial: true,
  })

  if (!confirmAdd) {
    console.warn('⚠️ SSH key not added. You may need to do it manually.')
    return
  }

  const { title } = await prompts({
    type: 'text',
    name: 'title',
    message: 'Enter a name for your SSH key (e.g. my-dev-machine):',
    initial: 'my-dev-machine',
  })

  execSync(`gh ssh-key add "${pubKeyPath}" --title "${title}"`, {
    stdio: 'inherit',
  })
  console.log('✅ SSH key added to GitHub.')
}

async function finalizeSetup(projectPath, response) {
  console.log('\n📦 Installing dependencies...')
  execSync('npm install', { cwd: projectPath, stdio: 'inherit' })

  console.log('\n✅ Project is ready!\n')
  console.log('👉 To start:\n')

  if (response.createFolder) {
    console.log(`  cd ${response.projectName}`)
  }

  console.log('  npm run dev\n')
}
