
const fs = require('fs')

fs.rmSync('build', { recursive: true, force: true })
fs.mkdirSync('build')
if (!fs.existsSync('dist')){
	fs.mkdirSync('dist')
}

const packageJson = JSON.parse(fs.readFileSync('package.json'))

const meta = {
	"name": packageJson["name"],
	"version": packageJson["version"],
	"description": packageJson["description"],
	"dependencies": packageJson["dependencies"],
}

fs.writeFileSync('build/plugin.meta.json', JSON.stringify(meta), 'utf-8')
