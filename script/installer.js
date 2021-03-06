#!/usr/bin/env node

const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')
const rimraf = require('rimraf')

deleteOutputFolder()
    .then(getInstallerConfig)
    .then(createWindowsInstaller)
    .catch((error) => {
        console.error(error.message || error)
        process.exit(1)
    })

function getInstallerConfig() {

    const rootPath = path.join(__dirname, '..')
    const outPath = path.join(rootPath, 'out')

    return Promise.resolve({
        appDirectory: path.join(outPath, 'biobank-extractor-win32-ia32'),
        exe: 'biobank-extractor.exe',
        iconUrl: 'https://raw.githubusercontent.com/dsi-icl/biobank-extractor/master/sink/app-icon/win/app.ico',
        loadingGif: path.join(rootPath, 'sink', 'img', 'loading.gif'),
        noMsi: true,
        outputDirectory: path.join(outPath, 'windows-installer'),
        name: 'UKBiobankExtractor',
        setupExe: 'UKBiobankExtractorSetup.exe',
        setupIcon: path.join(rootPath, 'sink', 'app-icon', 'win', 'app.ico'),
        skipUpdateIcon: true
    })
}

function deleteOutputFolder() {

    return new Promise((resolve, reject) => {
        rimraf(path.join(__dirname, '..', 'out', 'windows-installer'), (error) => {
            error ? reject(error) : resolve()
        })
    })
}
