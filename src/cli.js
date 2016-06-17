import Path from 'path';
import Commander from 'commander';
import Helper from 'nutra-helper';
import Nutra from './nutra.js';

export default (processArgs) => {
    Commander
    .option('--config <path>')
    .parse(processArgs)

    try {
        require(Path.join(process.cwd(), Commander.config))
    } catch(e) {
        console.error(`
            Please provide a valid configuration file.
            Value received did not lead to a valid module: "${Commander.config}"
            Did you pass a config parameter? --config "path/to/nutra.config.js"
            Actual error: ${e.message}
        `)
        return false
    }

    (Nutra(Commander.config)).start()
}
