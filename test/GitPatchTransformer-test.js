import { equal } from 'assert'
import ScriptTransformer from '../src/GitPatchTransformer'

describe('ScriptTransformer', () => {
  it('should return name correctly', () => {
    equal((new ScriptTransformer()).name, 'git-patch')
  })
})
