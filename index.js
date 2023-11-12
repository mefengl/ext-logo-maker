#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const process = require('node:process')
const sharp = require('sharp')
const archiver = require('archiver')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function resizeImage(imagePath, outputDir, size, extension) {
  const baseName = path.basename(imagePath, extension)
  const outputFile = path.join(outputDir, `${baseName}-${size}${extension}`)
  return sharp(imagePath)
    .resize(size, size)
    .toFormat(extension.replace('.', ''))
    .toFile(outputFile)
}

function createZipFile(outputDir, baseName) {
  const zipFilePath = path.join(process.cwd(), `${baseName}.zip`)
  const output = fs.createWriteStream(zipFilePath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    archive
      .directory(outputDir, false)
      .on('error', err => reject(err))
      .pipe(output)

    output.on('close', () => resolve(zipFilePath))
    archive.finalize()
  })
}

async function resizeAndZip(imagePath, createZip) {
  try {
    console.log(`Starting resizeAndZip for ${imagePath}`)

    const extension = path.extname(imagePath).toLowerCase()
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.tiff']
    if (!supportedFormats.includes(extension))
      throw new Error(`Unsupported file format: ${extension}`)

    const outputDir = fs.mkdtempSync('/tmp/resize-and-zip-')
    console.log(`Temporary output directory created at ${outputDir}`)

    const sizes = [16, 32, 48, 96, 128]
    for (const size of sizes) {
      await resizeImage(imagePath, outputDir, size, extension)
      console.log(`Resized image to ${size}x${size}`)
    }

    if (createZip) {
      const baseName = path.parse(imagePath).name
      const zipFilePath = await createZipFile(outputDir, baseName)
      console.log(`Zip file created at: ${zipFilePath}`)
    }
    else {
      console.log(`Images saved in ${outputDir}`)
    }

    fs.rmSync(outputDir, { recursive: true, force: true })
    console.log(`Cleanup completed for ${outputDir}`)
  }
  catch (error) {
    console.error(`An error occurred: ${error.message}`)
    process.exit(1)
  }
  finally {
    rl.close()
  }
}

(async function () {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 1) {
      console.error('Usage: ext-logo-maker <path-to-image>')
      process.exit(1)
    }

    const createZip = await askQuestion('Do you want to create a ZIP file? (yes/no) ')
    await resizeAndZip(args[0], ['yes', 'y'].includes(createZip.trim().toLowerCase()))
  }
  catch (error) {
    console.error(`An unexpected error occurred: ${error.message}`)
    process.exit(1)
  }
})()
