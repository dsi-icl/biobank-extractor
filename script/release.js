#!/usr/bin/env node

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const request = require('request')
const util = require('util')
const token = process.env.BIOBANK_EXTRACTOR_GITHUB_TOKEN
const version = require('../package').version

checkToken()
    .then(checkHerokuLoginStatus)
    .then(zipAssets)
    .then(createRelease)
    .then(uploadAssets)
    .then(publishRelease)
    .then(deployToHeroku)
    .catch((error) => {
        console.error(error.message || error)
        process.exit(1)
    })

function checkToken() {

    if (!token) {
        return Promise.reject('BIOBANK_EXTRACTOR_GITHUB_TOKEN environment variable not set\nSet it to a token with repo scope created from https://github.com/settings/tokens/new')
    } else {
        return Promise.resolve(token)
    }
}

function checkHerokuLoginStatus() {

    return new Promise((resolve, reject) => {

        console.log('Checking Heroku login status')
        childProcess.exec('heroku whoami', (error, stdout, stderr) => {

            if (error) {
                reject('You are not logged in to GitHub\'s Heroku Enterprise account. To log in, run this command:\n$ heroku login --sso')
            } else {
                resolve()
            }
        })
    })
}

function zipAsset(asset) {

    return new Promise((resolve, reject) => {

        const assetBase = path.basename(asset.path)
        const assetDirectory = path.dirname(asset.path)
        console.log(`Zipping ${assetBase} to ${asset.name}`)

        if (!fs.existsSync(asset.path)) {

            return reject(new Error(`${asset.path} does not exist`))
        }

        const zipCommand = `zip --recurse-paths --symlinks '${asset.name}' '${assetBase}'`
        const options = { cwd: assetDirectory, maxBuffer: Infinity }
        childProcess.exec(zipCommand, options, (error) => {

            if (error) {

                reject(error)
            } else {

                asset.path = path.join(assetDirectory, asset.name)
                resolve(asset)
            }
        })
    })
}

function zipAssets() {

    const outPath = path.join(__dirname, '..', 'out')

    const zipAssets = [{
        name: 'biobank-extractor-mac.zip',
        path: path.join(outPath, 'biobank-extractor-darwin-x64', 'UK Biobank Extractor.app')
    }, {
        name: 'biobank-extractor-windows.zip',
        path: path.join(outPath, 'biobank-extractor-win32-ia32')
    }, {
        name: 'biobank-extractor-linux.zip',
        path: path.join(outPath, 'biobank-extractor-linux-x64')
    }]

    return Promise.all(zipAssets.map(zipAsset)).then((zipAssets) => {

        return zipAssets.concat([{
            name: 'RELEASES',
            path: path.join(outPath, 'windows-installer', 'RELEASES')
        }, {
            name: 'UKBiobankExtractorSetup.exe',
            path: path.join(outPath, 'windows-installer', 'UKBiobankExtractorSetup.exe')
        }, {
            name: `UKBiobankExtractor-${version}-full.nupkg`,
            path: path.join(outPath, 'windows-installer', `UKBiobankExtractor-${version}-full.nupkg`)
        }])
    })
}

function createRelease(assets) {

    const options = {
        uri: 'https://api.github.com/repos/dsi-icl/biobank-extractor/releases',
        headers: {

            Authorization: `token ${token}`,
            'User-Agent': `node/${process.versions.node}`
        },
        json: {

            tag_name: `v${version}`,
            target_commitish: 'master',
            name: version,
            body: 'An awesome new release :tada:',
            draft: true,
            prerelease: false
        }
    }

    return new Promise((resolve, reject) => {

        console.log('Creating new draft release')

        request.post(options, (error, response, body) => {

            if (error) {

                return reject(Error(`Request failed: ${error.message || error}`))
            }
            if (response.statusCode !== 201) {

                return reject(Error(`Non-201 response: ${response.statusCode}\n${util.inspect(body)}`))
            }

            resolve({ assets: assets, draft: body })
        })
    })
}

function uploadAsset(release, asset) {

    const options = {
        uri: release.upload_url.replace(/\{.*$/, `?name=${asset.name}`),
        headers: {

            Authorization: `token ${token}`,
            'Content-Type': 'application/zip',
            'Content-Length': fs.statSync(asset.path).size,
            'User-Agent': `node/${process.versions.node}`
        }
    }

    return new Promise((resolve, reject) => {

        console.log(`Uploading ${asset.name} as release asset`)

        const assetRequest = request.post(options, (error, response, body) => {

            if (error) {

                return reject(Error(`Uploading asset failed: ${error.message || error}`))
            }
            if (response.statusCode >= 400) {

                return reject(Error(`400+ response: ${response.statusCode}\n${util.inspect(body)}`))
            }

            resolve(asset)
        })
        fs.createReadStream(asset.path).pipe(assetRequest)
    })
}

function uploadAssets(release) {

    return Promise.all(release.assets.map((asset) => {

        return uploadAsset(release.draft, asset)
    })).then(() => release)
}

function publishRelease(release) {

    const options = {
        uri: release.draft.url,
        headers: {

            Authorization: `token ${token}`,
            'User-Agent': `node/${process.versions.node}`
        },
        json: {

            draft: false
        }
    }

    return new Promise((resolve, reject) => {

        console.log('Publishing release')

        request.post(options, (error, response, body) => {

            if (error) {

                return reject(Error(`Request failed: ${error.message || error}`))
            }
            if (response.statusCode !== 200) {

                return reject(Error(`Non-200 response: ${response.statusCode}\n${util.inspect(body)}`))
            }

            resolve(body)
        })
    })
}

function deployToHeroku() {

    return new Promise((resolve, reject) => {

        console.log('Deploying to heroku')

        const herokuCommand = [
            'heroku',
            'config:set',
            '-a',
            'github-biobank-extractor',
            `BIOBANK_EXTRACTOR_LATEST_RELEASE=${version}`
        ].join(' ')

        childProcess.exec(herokuCommand, (error) => {

            if (error) {

                reject(error)
            } else {

                resolve()
            }
        })
    })
} 
