import fs from 'fs'
import tmp from 'tmp'
import path from 'path'
import shell from 'shelljs'
import { getActiveCauldron } from 'ern-cauldron-api'

export interface GitPatchTransformerExtra {
  patchFiles: string[]
}

export default class ScriptTransformer {
  /**
   * Name of this transformer
   */
  get name(): string {
    return 'git-patch'
  }

  /**
   * Supported platforms
   */
  get platforms(): string[] {
    return ['ios', 'android']
  }

  /**
   * Transform the container
   */
  public async transform({
    containerPath,
    extra,
  }: {
      containerPath: string
      extra?: GitPatchTransformerExtra
    }) {
    if (!extra) {
      this.throwError('Missing extra property')
    }

    //
    // Validate extra object (throw if invalid)
    this.validate(extra!)

    const patchFiles = extra!.patchFiles
    for (const patchFile of patchFiles) {
      let pathToPatchFile = patchFile
      if (patchFile.startsWith('cauldron://')) {
        const localRepoPath = tmp.dirSync({ unsafeCleanup: true }).name
        const cauldron = await getActiveCauldron({ localRepoPath })
        if (!cauldron) {
          this.throwError('A Cauldron needs to be active for using a patch file stored in the Cauldron')
        }
        if (!await cauldron.hasFile({ cauldronFilePath: patchFile })) {
          this.throwError(`Cannot find ${patchFile} in Cauldron`)
        }
        const patchFileContent = await cauldron.getFile({ cauldronFilePath: patchFile })
        const patchFileName = path.basename(patchFile.replace('cauldron://', ''))
        const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name
        pathToPatchFile = path.join(tmpDir, patchFileName)
        fs.writeFileSync(pathToPatchFile, patchFileContent.toString())
      }

      const gitApplyCommand = `git apply ${pathToPatchFile}`
      const gitApplyResult = shell.exec(gitApplyCommand, {cwd:containerPath})
      if (gitApplyResult.code !== 0) {
        throw new Error(`${gitApplyCommand} failed with exit code ${gitApplyResult.code}`)
      }
    }
  }

  public validate(extra: GitPatchTransformerExtra) {
    if (!extra.patchFiles) {
      this.throwError('Missing extra patchFiles array')
    }
  }

  public throwError(msg: string) {
    throw new Error(`[GitPatchTransformer] ${msg}`)
  }
}
