import { createWorker } from "tesseract.js";

export const OcrService = {
  async readFileContent(file: File): Promise<string> {
    const worker = await createWorker("fra");
    const ret = await worker.recognize(file);
    console.log(ret.data.text);
    await worker.terminate();
    return ret.data.text;
  },
};
