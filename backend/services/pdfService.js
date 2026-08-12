const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

async function processPdfs(dataFolder = "./data") {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  if (fs.existsSync(dataFolder)) {
    const files = fs.readdirSync(dataFolder);

    for (const file of files) {
      if (path.extname(file).toLowerCase() !== ".pdf") {
        continue;
      }

      try {
        const dataBuffer = fs.readFileSync(path.join(dataFolder, file));
        const data = await pdf(dataBuffer);
        await splitter.createDocuments([data.text]);
      //  console.log(`Processed PDF: ${file}`);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  }
}

module.exports = { processPdfs };