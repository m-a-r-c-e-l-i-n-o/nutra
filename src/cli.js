import Path from 'path';
import Commander from 'commander';
import Helper from 'nutra-helper';
import Nutra from './nutra.js';
import AppConfig from '../app.config.js';

export default (processArgs) => {
    Commander
    .option('--config <path>')
    .parse(processArgs)
    try {
        require(Path.join(process.cwd(), Commander.config))
    } catch(e) {
        throw new Error(AppConfig.errors.invalidCLIConfigOption)
    }
    Nutra({ configFile: Commander.config }).start()
}
