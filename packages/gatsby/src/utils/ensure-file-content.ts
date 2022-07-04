import { outputFile, readFile } from "fs-extra"
import reporter from "gatsby-cli/lib/reporter"

export async function ensureFileContent(
  file: string,
  data: any
): Promise<void> {
  let previousContent: string | undefined = undefined
  try {
    previousContent = await readFile(file, `utf8`)
  } catch (e) {
    // whatever throws, we'll just write the file
  }

  if (previousContent !== data) {
    reporter.verbose(`Updating "${file}"`)
    return outputFile(file, data)
  }

  reporter.verbose(`Skipping "${file}"`)
  return undefined
}
